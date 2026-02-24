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
                Console.WriteLine($"[DEBUG-STATUS] Topic: {topic} | Payload: {payloadStr}");

                try 
                {
                    var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr, _jsonOptions);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        
                        if (reader != null)
                        {
                            bool stateChanged = false; 

                            if (!string.IsNullOrEmpty(statusData?.ip) && statusData.ip != "-") 
                            {
                                reader.IpAddress = statusData.ip;
                            }

                            if (reader.IsActive == false || reader.IsActive == null)
                            {
                                reader.IsActive = true; 
                                stateChanged = true;
                                Console.WriteLine($"✅ Reader {readerName} is ONLINE (Connected)");
                            }

                            reader.UpdatedAt = ThaiTime(); 

                            if (statusData?.status == "active")
                            {
                                if (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดปกติ (Normal)"; 
                                    stateChanged = true;
                                    Console.WriteLine($"🔘 Hardware Wakeup: {readerName} is now Normal.");
                                }
                            }
                            else if (statusData?.status == "sleep")
                            {
                                if (reader.CurrentMode != "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดหลับ (SLEEP)"; 
                                    stateChanged = true;
                                    Console.WriteLine($"💤 Hardware Reported Sleep: {readerName}");
                                }
                            }

                            await context.SaveChangesAsync();

                            if (stateChanged)
                            {
                                await _hubContext.Clients.All.SendAsync("OnModeChanged");
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ Heartbeat Error: {ex.Message}"); }
                return;
            }

            // -----------------------------------------------------------
            // 🔵 CASE B: Scan RFID (รองรับทั้ง Sequential และ Batch Override)
            // -----------------------------------------------------------
            if (topic.EndsWith("/scan"))
            {
                Console.WriteLine($"[DEBUG-SCAN] Topic: {topic} | Payload: {payloadStr}");

                await TriggerLed(readerName, "YELLOW");

                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                    
                    List<string> rfidTagsToProcess = new List<string>();

                    if (payloadStr.Trim().StartsWith("{")) 
                    {
                        try {
                            var data = JsonSerializer.Deserialize<ScanBatchPayload>(payloadStr, _jsonOptions);
                            
                            if (data?.rfid_tags != null && data.rfid_tags.Count > 0) {
                                rfidTagsToProcess.AddRange(data.rfid_tags);
                            } 
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
                        bool stateChanged = false;

                        readerDB.UpdatedAt = ThaiTime(); 

                        if (readerDB.IsActive == false || readerDB.IsActive == null) {
                            readerDB.IsActive = true;
                            stateChanged = true;
                        }

                        if (readerDB.CurrentMode == "SLEEP" || readerDB.CurrentMode == "โหมดหลับ (SLEEP)") {
                             readerDB.CurrentMode = "โหมดปกติ (Normal)";
                             stateChanged = true;
                        }

                        await context.SaveChangesAsync();
                        if (stateChanged) await _hubContext.Clients.All.SendAsync("OnModeChanged");
                    }

                    if (!_readerStates.ContainsKey(readerName)) {
                        _readerStates[readerName] = new ReaderRuntimeState();
                    }
                    var state = _readerStates[readerName];
                    string currentMode = readerDB?.CurrentMode ?? "โหมดปกติ (Normal)";

                    // 🔥🔥🔥 สเต็ปที่ 1: Pre-scan (กวาดสายตาหา Special Tag ในกอง) 🔥🔥🔥
                    string? overrideModeForBatch = null;
                    List<string> regularTagsInBatch = new List<string>();

                    foreach (var rfid in rfidTagsToProcess)
                    {
                        if (string.IsNullOrEmpty(rfid)) continue;

                        var specialTag = await context.SpecialTags.FindAsync(rfid);
                        if (specialTag != null)
                        {
                            overrideModeForBatch = specialTag.CommandType;
                        }
                        else
                        {
                            regularTagsInBatch.Add(rfid);
                        }
                    }

                    if (overrideModeForBatch != null)
                    {
                        currentMode = overrideModeForBatch;
                        state.ScanningUntil = (currentMode == "โหมดปกติ (Normal)" || currentMode == "Normal") ? null : ThaiTime().AddSeconds(30); 
                        
                        if(readerDB != null) {
                            readerDB.CurrentMode = currentMode;
                            await context.SaveChangesAsync();
                        }
                        Console.WriteLine($"🎛 [Batch Mode Override] Special Tag found in batch -> Mode set to: {currentMode}");
                        await TriggerLed(readerName, "GREEN");
                        await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                    }
                    else
                    {
                        if (currentMode != "โหมดปกติ (Normal)" && currentMode != "Normal" && state.ScanningUntil.HasValue && !state.IsScanningActive)
                        {
                            currentMode = "โหมดปกติ (Normal)";
                            if(readerDB != null) {
                                readerDB.CurrentMode = "โหมดปกติ (Normal)";
                                await context.SaveChangesAsync();
                            }
                        }
                    }

                    // 🔥🔥🔥 สเต็ปที่ 2: วนลูปประมวลผล Tag ด้วยชื่อสถานที่แบบ Master Data 🔥🔥🔥
                    foreach (var rfid in regularTagsInBatch)
                    {
                        var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                        
                        if (linen != null)
                        {
                            bool isDuplicate = false;
                            bool shouldSave = false;
                            string prevLoc = linen.CurrentLocation ?? "ไม่ระบุ";
                            string finalStatus = TranslateStatus(linen.Status ?? ""); 

                            Console.WriteLine($"🔍 Processing {rfid} | Reader: '{readerName}' | Mode: {currentMode} | Status: {linen.Status}");

                            // 📍 โหมดปกติ จะดึงชื่อสถานที่จาก Master Data ตามที่ตั้งค่าไว้ใน Reader เป๊ะๆ
                            string targetLocation = readerName; 
                            if (readerDB != null && !string.IsNullOrEmpty(readerDB.Location)) {
                                targetLocation = readerDB.Location; 
                            }

                            switch (currentMode)
                            {
                                case "ส่งผ้าซัก": 
                                case "โหมดส่งซัก": 
                                case "MODE_WASH": 
                                    if (linen.Status == "ส่งซัก" || linen.Status == "SendingToLaundry") isDuplicate = true;
                                    else { linen.Status = "ส่งซัก"; finalStatus = "ส่งซัก"; linen.CurrentLocation = "จุดพักผ้ารอซัก"; LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "จุดพักผ้ารอซัก"); shouldSave = true; }
                                    break;

                                case "ส่งซักซ้ำ":
                                case "โหมดส่งซักซ้ำ":
                                case "MODE_REWASH":
                                    if (linen.Status == "ส่งซักซ้ำ" || linen.Status == "ReWash") isDuplicate = true;
                                    else { linen.Status = "ส่งซักซ้ำ"; finalStatus = "ส่งซักซ้ำ"; linen.CurrentLocation = "จุดพักผ้ารอซัก"; LogMovement(context, linen.LinenId, "ReWash", "ส่งผ้ากลับไปซักใหม่ (พบรอยเปื้อน)", prevLoc, "จุดพักผ้ารอซัก"); shouldSave = true; }
                                    break;

                                case "กำลังซัก": 
                                case "รับผ้าซัก":
                                case "MODE_RECEIVE_LAUNDRY": 
                                    if (linen.Status == "กำลังซัก" || linen.Status == "Washing") isDuplicate = true;
                                    else { 
                                        linen.Status = "กำลังซัก"; 
                                        finalStatus = "กำลังซัก"; 
                                        linen.CurrentLocation = "โรงซัก"; 
                                        linen.WashCount++; 
                                        linen.LastWashDate = ThaiTime(); 
                                        LogMovement(context, linen.LinenId, "ReceiveWash", "รับผ้าเข้าเครื่องซัก", prevLoc, "โรงซัก"); 
                                        shouldSave = true; 

                                        // ✅ แจ้งเตือนเมื่อรอบซักครบ/เกินกำหนด
                                        if (linen.Product != null && linen.Product.MaxWashCount > 0 && linen.WashCount >= linen.Product.MaxWashCount)
                                        {
                                            var noti = new Notification
                                            {
                                                RoleId = 1, // 1 = ส่งหา Admin/หัวหน้าห้องผ้า
                                                Title = "⚠️ ผ้าครบกำหนดรอบซัก",
                                                Message = $"รหัส {linen.RfidCode} ({linen.Product?.ProductName}) ซักครบ {linen.WashCount}/{linen.Product?.MaxWashCount} รอบแล้ว แนะนำให้พิจารณาตัดจำหน่าย",
                                                Type = "WARNING",
                                                IsRead = false,
                                                LinkUrl = "/search-linen",
                                                CreatedAt = ThaiTime()
                                            };
                                            context.Notifications.Add(noti);
                                        }
                                    }
                                    break;

                                case "รับกลับเข้าคลัง": 
                                case "โหมดรับเข้าคลัง": 
                                case "MODE_RESTOCK":
                                    if ((linen.Status == "พร้อมใช้" || linen.Status == "Available") && linen.CurrentLocation == "คลังผ้าสะอาด") isDuplicate = true;
                                    else { 
                                        linen.Status = "พร้อมใช้"; 
                                        finalStatus = "พร้อมใช้"; 
                                        linen.CurrentLocation = "คลังผ้าสะอาด"; 
                                        LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "คลังผ้าสะอาด"); 
                                        shouldSave = true; 

                                        // ✅ แจ้งเตือน: เช็คอายุการใช้งานของผ้า (ดึงวันที่จาก RegisteredAt ใน DB)
                                        if (linen.Product != null && linen.Product.MaxLifespanDays > 0)
                                        {
                                            var daysUsed = (ThaiTime() - linen.RegisteredAt).TotalDays;
                                            if (daysUsed >= linen.Product.MaxLifespanDays)
                                            {
                                                var noti = new Notification
                                                {
                                                    RoleId = 1, 
                                                    Title = "⏰ ผ้าหมดอายุการใช้งาน",
                                                    Message = $"รหัส {linen.RfidCode} ({linen.Product?.ProductName}) ใช้งานเกินกำหนด ({Math.Floor(daysUsed)}/{linen.Product?.MaxLifespanDays} วัน) แนะนำให้พิจารณาตัดจำหน่าย",
                                                    Type = "DANGER",
                                                    IsRead = false,
                                                    LinkUrl = "/search-linen",
                                                    CreatedAt = ThaiTime()
                                                };
                                                context.Notifications.Add(noti);
                                            }
                                        }
                                    }
                                    break;

                                case "จำหน่ายออก": 
                                case "MODE_DISCARD":
                                    if (linen.IsActive == false) isDuplicate = true;
                                    else { linen.Status = "จำหน่ายออก"; finalStatus = "จำหน่ายออก"; linen.IsActive = false; linen.CurrentLocation = "จุดจำหน่าย"; LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "จุดจำหน่าย"); shouldSave = true; }
                                    break;

                                case "กำลังจัดส่ง": 
                                case "โหมดส่งไปยังวอร์ด": 
                                case "MODE_DISPATCH":
                                    if (linen.Status == "กำลังส่ง" && linen.CurrentLocation == "ระหว่างขนส่ง") isDuplicate = true;
                                    else { linen.Status = "กำลังส่ง"; finalStatus = "กำลังส่ง"; linen.CurrentLocation = "ระหว่างขนส่ง"; LogMovement(context, linen.LinenId, "Dispatch", "กำลังขนส่งไปยังปลายทาง", prevLoc, "ระหว่างขนส่ง"); shouldSave = true; }
                                    break;

                                default: 
                                    if (linen.CurrentLocation != targetLocation) {
                                        linen.CurrentLocation = targetLocation;  
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
                case "ReWash": return "ส่งซักซ้ำ"; 
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
                            await _hubContext.Clients.All.SendAsync("OnModeChanged");
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
                            await _hubContext.Clients.All.SendAsync("OnModeChanged");
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

    public class ScanPayload { 
        public string? rfid { get; set; } 
    }
    
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