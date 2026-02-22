using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Extensions.ManagedClient;
using System.Text;
using System.Text.Json;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using System.Collections.Concurrent;

namespace Backend.Services
{
    public class ReaderRuntimeState
    {
        public DateTime? ScanningUntil { get; set; } 
        public bool IsScanningActive => ScanningUntil.HasValue && DateTime.UtcNow.AddHours(7) <= ScanningUntil.Value;
    }

    public class MqttListenerService : BackgroundService
    {
        private IManagedMqttClient? _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly MqttPublisherService _mqttPublisher; 

        private static ConcurrentDictionary<string, ReaderRuntimeState> _readerStates = new();

        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        // ✅ กำหนดขา GPIO
        private const string GPIO_GREEN = "12";
        private const string GPIO_YELLOW = "13";
        private const string GPIO_RED = "14";

        public MqttListenerService(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hubContext, MqttPublisherService mqttPublisher)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _mqttPublisher = mqttPublisher;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        private async Task TriggerLed(string readerName, string color)
        {
            string gpio = color switch
            {
                "GREEN" => GPIO_GREEN,
                "YELLOW" => GPIO_YELLOW,
                "RED" => GPIO_RED,
                _ => GPIO_GREEN
            };
            await _mqttPublisher.PublishCommandAsync(readerName, "LED", gpio, true);
        }

        private async Task SetSleepMode(string readerName, bool sleep)
        {
            string cmd = sleep ? "SLEEP" : "WAKE";
            await _mqttPublisher.PublishCommandAsync(readerName, cmd, "", false);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var mqttFactory = new MqttFactory();
            var mqttClientOptions = new MqttClientOptionsBuilder()
                .WithClientId("Backend_Service_Main_" + Guid.NewGuid().ToString())
                .WithTcpServer("localhost", 1883)
                .WithCleanSession()
                .Build();

            var managedMqttClientOptions = new ManagedMqttClientOptionsBuilder()
                .WithClientOptions(mqttClientOptions)
                .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
                .Build();

            _mqttClient = mqttFactory.CreateManagedMqttClient();

            _mqttClient.ConnectedAsync += async e =>
            {
                Console.WriteLine("✅ [MQTT] Connected and Subscribed!");
                if (_mqttClient != null)
                {
                    await _mqttClient.SubscribeAsync("reader/+/scan");
                    await _mqttClient.SubscribeAsync("reader/+/status");
                }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                await ProcessMessage(e);
            };

            await _mqttClient.StartAsync(managedMqttClientOptions);
            _ = MonitorOfflineNodes(stoppingToken); 

            while (!stoppingToken.IsCancellationRequested) await Task.Delay(1000, stoppingToken);
        }

        private async Task ProcessMessage(MqttApplicationMessageReceivedEventArgs e)
        {
            var topic = e.ApplicationMessage.Topic;
            var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            var parts = topic.Split('/');
            
            string readerName = (parts.Length >= 2) ? parts[1].Trim() : "Unknown";

            // -----------------------------------------------------------
            // 🟢 CASE A: Status Heartbeat (Online Status / Wake Up)
            // -----------------------------------------------------------
            if (topic.EndsWith("/status"))
            {
                try 
                {
                    var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr, _jsonOptions);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        
                        if (reader != null)
                        {
                            reader.IsActive = true; 
                            reader.UpdatedAt = ThaiTime(); 

                            if (statusData?.ip != null) reader.IpAddress = statusData.ip;

                            if (statusData?.status == "active")
                            {
                                if (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดปกติ (Normal)"; // ✅ อัปเดตให้เป็นภาษาไทย
                                    Console.WriteLine($"🔘 Hardware Wakeup: {readerName} is now ACTIVE.");
                                }
                            }
                            else if (statusData?.status == "sleep")
                            {
                                if (reader.CurrentMode != "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดหลับ (SLEEP)"; // ✅ อัปเดตให้เป็นภาษาไทย
                                    Console.WriteLine($"💤 Hardware Reported Sleep: {readerName}");
                                }
                            }

                            await context.SaveChangesAsync();
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ Heartbeat Error: {ex.Message}"); }
                return;
            }

            // -----------------------------------------------------------
            // 🔵 CASE B: Scan RFID (รองรับการรับแบบ Batch Array)
            // -----------------------------------------------------------
            if (topic.EndsWith("/scan"))
            {
                await TriggerLed(readerName, "YELLOW");

                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                    
                    List<string> rfidTagsToProcess = new List<string>();

                    // 📦 1. พยายาม Parse JSON แบบใหม่ (Batch Array)
                    if (payloadStr.Trim().StartsWith("{")) 
                    {
                        try {
                            var data = JsonSerializer.Deserialize<ScanBatchPayload>(payloadStr, _jsonOptions);
                            
                            // ถ้ารับแบบ Batch มาได้ ให้เพิ่มลง List
                            if (data?.rfid_tags != null && data.rfid_tags.Count > 0) {
                                rfidTagsToProcess.AddRange(data.rfid_tags);
                            } 
                            // Fallback เผื่อมีข้อความแบบเก่าหลงมา
                            else if (!string.IsNullOrEmpty(data?.rfid)) {
                                rfidTagsToProcess.Add(data.rfid);
                            }
                        } catch { /* Ignore */ }
                    }
                    else {
                        rfidTagsToProcess.Add(payloadStr.Trim());
                    }

                    if (rfidTagsToProcess.Count == 0) return;

                    var readerDB = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                    
                    if (readerDB != null) {
                        readerDB.UpdatedAt = ThaiTime(); 
                        readerDB.IsActive = true; 

                        if (readerDB.CurrentMode == "SLEEP" || readerDB.CurrentMode == "โหมดหลับ (SLEEP)") {
                             readerDB.CurrentMode = "โหมดปกติ (Normal)";
                        }
                        await context.SaveChangesAsync();
                    }

                    string currentMode = readerDB?.CurrentMode ?? "โหมดปกติ (Normal)";

                    if (!_readerStates.ContainsKey(readerName)) {
                        _readerStates[readerName] = new ReaderRuntimeState();
                    }
                    var state = _readerStates[readerName];

                    // 🔄 วนลูปประมวลผลทีละ Tag ใน Batch
                    foreach (var rfid in rfidTagsToProcess)
                    {
                        if (string.IsNullOrEmpty(rfid)) continue;

                        // 2.1 เช็ค Special Tag (เปลี่ยนโหมด)
                        var specialTag = await context.SpecialTags.FindAsync(rfid);
                        if (specialTag != null)
                        {
                            currentMode = specialTag.CommandType; // ✅ ใช้ค่าจาก DB ตรงๆ
                            
                            // ถ้าไม่ใช่โหมดปกติ ให้มีเวลานับถอยหลัง 30 วินาที
                            state.ScanningUntil = (currentMode == "โหมดปกติ (Normal)" || currentMode == "Normal") ? null : ThaiTime().AddSeconds(30); 
                            
                            if(readerDB != null) {
                                readerDB.CurrentMode = currentMode;
                                await context.SaveChangesAsync();
                            }

                            Console.WriteLine($"🎛 [Mode Change] {readerName} -> {currentMode} (Triggered by {rfid})");
                            await TriggerLed(readerName, "GREEN");
                            await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                            continue; // ข้ามไปอ่าน Tag ถัดไปใน Batch
                        }

                        // 2.2 เช็ค Timeout โหมดพิเศษ (หมดเวลา 30 วิ ให้กลับเป็นโหมดปกติ)
                        if (currentMode != "โหมดปกติ (Normal)" && currentMode != "Normal" && state.ScanningUntil.HasValue && !state.IsScanningActive)
                        {
                            currentMode = "โหมดปกติ (Normal)";
                            if(readerDB != null) {
                                readerDB.CurrentMode = "โหมดปกติ (Normal)";
                                await context.SaveChangesAsync();
                            }
                        }

                        // 2.3 ประมวลผลผ้า
                        var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                        
                        if (linen != null)
                        {
                            bool isDuplicate = false;
                            bool shouldSave = false;
                            string prevLoc = linen.CurrentLocation ?? "ไม่ระบุ";
                            string finalStatus = TranslateStatus(linen.Status); 

                            Console.WriteLine($"🔍 Processing {rfid} | Reader: '{readerName}' | Mode: {currentMode} | Status: {linen.Status}");

                            // 📍 2.4 ดึงสถานที่ตั้งของ Reader (เพื่อ Update Location ของผ้า)
                            string targetLocation = readerName; 
                            if (readerDB != null && !string.IsNullOrEmpty(readerDB.Location)) {
                                targetLocation = readerDB.Location; 
                            }

                            // ✅ 2.5 ปรับ Switch Case ให้ตรงกับคำใน Database ของคุณเป๊ะๆ
                            switch (currentMode)
                            {
                                case "ส่งผ้าซัก": // ตรงกับรูปใน DBeaver
                                case "โหมดส่งซัก": 
                                case "MODE_WASH": 
                                    if (linen.Status == "ส่งซัก" || linen.Status == "SendingToLaundry") isDuplicate = true;
                                    else { linen.Status = "ส่งซัก"; finalStatus = "ส่งซัก"; linen.CurrentLocation = "จุดรอรับ (Transit)"; LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "จุดรอรับ (Transit)"); shouldSave = true; }
                                    break;

                                case "กำลังซัก": // ตรงกับรูปใน DBeaver
                                case "รับผ้าซัก":
                                case "MODE_RECEIVE_LAUNDRY": 
                                    if (linen.Status == "กำลังซัก" || linen.Status == "Washing") isDuplicate = true;
                                    else { linen.Status = "กำลังซัก"; finalStatus = "กำลังซัก"; linen.CurrentLocation = "โรงซัก (Laundry)"; linen.WashCount++; linen.LastWashDate = ThaiTime(); LogMovement(context, linen.LinenId, "ReceiveWash", "รับผ้าเข้าเครื่องซัก", prevLoc, "โรงซัก (Laundry)"); shouldSave = true; }
                                    break;

                                case "รับกลับเข้าคลัง": // ตรงกับรูปใน DBeaver
                                case "โหมดรับเข้าคลัง": 
                                case "MODE_RESTOCK":
                                    if ((linen.Status == "พร้อมใช้" || linen.Status == "Available") && linen.CurrentLocation == "คลังผ้า (Stock)") isDuplicate = true;
                                    else { linen.Status = "พร้อมใช้"; finalStatus = "พร้อมใช้"; linen.CurrentLocation = "คลังผ้า (Stock)"; LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "คลังผ้า (Stock)"); shouldSave = true; }
                                    break;

                                case "จำหน่ายออก": // ตรงกับรูปใน DBeaver
                                case "MODE_DISCARD":
                                    if (linen.IsActive == false) isDuplicate = true;
                                    else { linen.Status = "จำหน่ายออก"; finalStatus = "จำหน่ายออก"; linen.IsActive = false; linen.CurrentLocation = "จุดจำหน่าย (Disposal)"; LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "จุดจำหน่าย (Disposal)"); shouldSave = true; }
                                    break;

                                case "กำลังจัดส่ง": // ตรงกับรูปใน DBeaver
                                case "โหมดส่งไปยังวอร์ด": 
                                case "MODE_DISPATCH":
                                    if (linen.Status == "กำลังส่ง" && linen.CurrentLocation == "ระหว่างขนส่ง") isDuplicate = true;
                                    else { linen.Status = "กำลังส่ง"; finalStatus = "กำลังส่ง"; linen.CurrentLocation = "ระหว่างขนส่ง"; LogMovement(context, linen.LinenId, "Dispatch", "กำลังขนส่งไปยังปลายทาง", prevLoc, "ระหว่างขนส่ง"); shouldSave = true; }
                                    break;

                                default: // โหมดปกติ (Normal Mode)
                                    if (linen.CurrentLocation != targetLocation) {
                                        linen.CurrentLocation = targetLocation; // ✅ อัปเดต Location ตาม Reader 
                                        shouldSave = true;
                                        if(linen.Status == "กำลังส่ง" || linen.Status == "Dispatch" || linen.Status == "ระหว่างขนส่ง") {
                                            linen.Status = "ถูกใช้งาน"; finalStatus = "ถูกใช้งาน (รับเข้า)"; LogMovement(context, linen.LinenId, "Receive", "รับผ้าจากการขนส่ง (Auto)", prevLoc, targetLocation);
                                        } else if(linen.Status == "พร้อมใช้" || linen.Status == "Available") {
                                            linen.Status = "ถูกใช้งาน"; finalStatus = "ถูกใช้งาน"; LogMovement(context, linen.LinenId, "Move", "นำผ้าไปใช้งาน", prevLoc, targetLocation);
                                        } else {
                                            LogMovement(context, linen.LinenId, "Move", "ย้ายตำแหน่ง", prevLoc, targetLocation);
                                        }
                                    } else { isDuplicate = true; }
                                    break;
                            }

                            // แจ้งเตือนหน้าเว็บ
                            if (isDuplicate) {
                                Console.WriteLine($"🔁 [Duplicate] {rfid}");
                                await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = true });
                            }
                            else if (shouldSave) {
                                linen.UpdatedAt = ThaiTime();
                                await context.SaveChangesAsync();
                                Console.WriteLine($"✅ [Success] {rfid} moved to {linen.CurrentLocation}");
                                await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, location = linen.CurrentLocation, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = false });
                            }
                        }
                        else
                        {
                            Console.WriteLine($"❓ [Unknown] {rfid}");
                            await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = "ไม่พบในระบบ", productName = "ไม่พบในระบบ", timestamp = ThaiTime(), isDuplicate = false });
                        }
                    }

                    // ✅ จบการลูป (สแกน Batch เสร็จหมด) -> สั่งไฟเขียว (Ready) 
                    await TriggerLed(readerName, "GREEN");
                }
            }
        }

        private string TranslateStatus(string status)
        {
            if (string.IsNullOrEmpty(status)) return "ไม่ระบุ";
            switch (status) {
                case "Available": return "พร้อมใช้";
                case "In Use": return "ถูกใช้งาน";
                case "SendingToLaundry": return "ส่งซัก";
                case "Washing": return "กำลังซัก";
                case "Discarded": return "จำหน่ายออก";
                case "Dispatch": return "กำลังส่ง";
                default: return status;
            }
        }

        private async Task MonitorOfflineNodes(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var now = ThaiTime();

                        var offlineThreshold = now.AddSeconds(-15);
                        var offlineReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < offlineThreshold)
                            .ToListAsync(stoppingToken);

                        if (offlineReaders.Any())
                        {
                            foreach (var reader in offlineReaders)
                            {
                                reader.IsActive = false; 
                                Console.WriteLine($"🔌 Reader {reader.ReaderName} is OFFLINE (No Heartbeat > 15s)");
                            }
                            await context.SaveChangesAsync(stoppingToken);
                        }

                        var sleepThreshold = now.AddSeconds(-30);
                        var activeIdleReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < sleepThreshold && r.CurrentMode != "SLEEP" && r.CurrentMode != "โหมดหลับ (SLEEP)")
                            .ToListAsync(stoppingToken);

                        if (activeIdleReaders.Any())
                        {
                            foreach (var reader in activeIdleReaders)
                            {
                                await SetSleepMode(reader.ReaderName, true);
                                reader.CurrentMode = "โหมดหลับ (SLEEP)";
                                Console.WriteLine($"💤 Reader {reader.ReaderName} Timeout (30s) -> SLEEP MODE");
                            }
                            await context.SaveChangesAsync(stoppingToken);
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"⚠️ Monitor Error: {ex.Message}"); }
            }
        }

        private void LogMovement(LinenDbContext context, int linenId, string activity, string desc, string from, string to)
        {
            context.LinenLogs.Add(new LinenLog
            {
                LinenId = linenId,
                ActivityType = activity,
                Description = desc,
                FromLocation = from,
                ToLocation = to,
                Timestamp = ThaiTime(),
                CreatedAt = ThaiTime()
            });
        }
    }

    // ✅ คลาส DTO สำหรับรับข้อมูลแบบเดิม (1 Tag ต่อข้อความ)
    public class ScanPayload { 
        public string? rfid { get; set; } 
    }
    
    // 🚀 [NEW] คลาส DTO สำหรับรับข้อมูลแบบ Array (Batch Processing จาก ESP32 ล่าสุด)
    public class ScanBatchPayload {
        public string? reader_id { get; set; }
        public List<string>? rfid_tags { get; set; }
        public string? rfid { get; set; }
    }
    
    public class ReaderStatusDto { 
        public string? ip { get; set; } 
        public string? status { get; set; } 
        public string? source { get; set; } 
    }
}