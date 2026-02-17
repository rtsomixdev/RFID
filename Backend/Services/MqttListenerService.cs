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
        private const string GPIO_RED = "27";

        public MqttListenerService(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hubContext, MqttPublisherService mqttPublisher)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _mqttPublisher = mqttPublisher;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        // Helper: สั่งเปิดไฟ LED
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

        // Helper: สั่ง Sleep/Wake
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
            _ = MonitorOfflineNodes(stoppingToken); // เริ่ม Loop เช็คเวลา

            while (!stoppingToken.IsCancellationRequested) await Task.Delay(1000, stoppingToken);
        }

        private async Task ProcessMessage(MqttApplicationMessageReceivedEventArgs e)
        {
            var topic = e.ApplicationMessage.Topic;
            var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            var parts = topic.Split('/');
            
            string readerName = (parts.Length >= 2) ? parts[1].Trim() : "Unknown";

            // -----------------------------------------------------------
            // 🟢 CASE A: Status Heartbeat
            // -----------------------------------------------------------
            if (topic.EndsWith("/status"))
            {
                // ✅ Heartbeat มา = Online แต่ "ไม่รีเซ็ตเวลา" UpdatedAt
                // เพื่อให้เวลานับถอยหลัง 30 วินาทีทำงานต่อไป
                try 
                {
                    var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr, _jsonOptions);
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if (reader != null)
                        {
                            bool wasOffline = !(reader.IsActive ?? false);
                            
                            reader.IsActive = true; 
                            // ❌ ลบ reader.UpdatedAt = ThaiTime(); ออก เพื่อไม่ให้รีเซ็ตเวลา
                            if (statusData?.ip != null) reader.IpAddress = statusData.ip;
                            await context.SaveChangesAsync();

                            // ถ้าเพิ่งตื่น/Online กลับมา -> สั่งไฟเขียว (Ready)
                            if (wasOffline) {
                                await TriggerLed(readerName, "GREEN");
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ Heartbeat Error: {ex.Message}"); }
                return;
            }

            // -----------------------------------------------------------
            // 🔵 CASE B: Scan RFID
            // -----------------------------------------------------------
            if (topic.EndsWith("/scan"))
            {
                // ✅ สแกนปุ๊บ -> สั่งไฟเหลือง (Latency/Busy)
                await TriggerLed(readerName, "YELLOW");

                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                    
                    string rfid = payloadStr;
                    if (payloadStr.Trim().StartsWith("{")) {
                        try {
                            var data = JsonSerializer.Deserialize<ScanPayload>(payloadStr, _jsonOptions);
                            rfid = data?.rfid ?? "";
                        } catch { /* Ignore */ }
                    }
                    if (string.IsNullOrEmpty(rfid)) return;

                    var readerDB = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                    
                    // ✅ สแกนเจอ -> รีเซ็ตเวลา (ต่ออายุไปอีก 30 วิ)
                    if (readerDB != null) {
                        readerDB.UpdatedAt = ThaiTime(); // Update เวลาล่าสุดที่ใช้งาน
                        
                        // ถ้าเคยหลับอยู่ (SLEEP) ให้ตื่นกลับมาเป็น Normal โดยอัตโนมัติด้วย
                        // (Hardware อาจไม่รับรู้การสแกนถ้าปิดเสา แต่ถ้า Hardware ส่งมาได้แสดงว่าตื่นแล้วหรือยังไม่หลับจริง)
                        if (readerDB.CurrentMode == "SLEEP") {
                             readerDB.CurrentMode = "Normal";
                        }
                        
                        await context.SaveChangesAsync();
                    }

                    string currentMode = readerDB?.CurrentMode ?? "Normal";

                    if (!_readerStates.ContainsKey(readerName)) {
                        _readerStates[readerName] = new ReaderRuntimeState();
                    }
                    var state = _readerStates[readerName];

                    // 1. เช็ค Special Tag
                    var specialTag = await context.SpecialTags.FindAsync(rfid);
                    if (specialTag != null)
                    {
                        currentMode = specialTag.CommandType;
                        state.ScanningUntil = (currentMode == "Normal") ? null : ThaiTime().AddSeconds(30); 
                        
                        if(readerDB != null) {
                            readerDB.CurrentMode = currentMode;
                            await context.SaveChangesAsync();
                        }

                        Console.WriteLine($"🎛 [Mode Change] {readerName} -> {currentMode}");
                        // เปลี่ยนโหมดเสร็จ -> สั่งไฟเขียว (พร้อมสแกนต่อ)
                        await TriggerLed(readerName, "GREEN");
                        await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                        return;
                    }

                    // 2. เช็ค Timeout (ของโหมดพิเศษ)
                    if (currentMode != "Normal" && state.ScanningUntil.HasValue && !state.IsScanningActive)
                    {
                        Console.WriteLine($"⛔ [Timeout] {readerName} reset to Normal.");
                        currentMode = "Normal";
                        if(readerDB != null) {
                            readerDB.CurrentMode = "Normal";
                            await context.SaveChangesAsync();
                        }
                    }

                    // 3. ประมวลผลผ้า
                    var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                    
                    if (linen != null)
                    {
                        bool isDuplicate = false;
                        bool shouldSave = false;
                        string prevLoc = linen.CurrentLocation ?? "ไม่ระบุ";
                        string finalStatus = TranslateStatus(linen.Status); 

                        Console.WriteLine($"🔍 Processing {rfid} | Reader: '{readerName}' | ModeDB: {currentMode} | Status: {linen.Status}");

                        switch (currentMode)
                        {
                            case "MODE_WASH":
                                if (linen.Status == "ส่งซัก" || linen.Status == "SendingToLaundry") isDuplicate = true;
                                else { linen.Status = "ส่งซัก"; finalStatus = "ส่งซัก"; linen.CurrentLocation = "จุดรอรับ (Transit)"; LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "จุดรอรับ (Transit)"); shouldSave = true; }
                                break;
                            case "MODE_RECEIVE_LAUNDRY": 
                                if (linen.Status == "กำลังซัก" || linen.Status == "Washing") isDuplicate = true;
                                else { linen.Status = "กำลังซัก"; finalStatus = "กำลังซัก"; linen.CurrentLocation = "โรงซัก (Laundry)"; linen.WashCount++; linen.LastWashDate = ThaiTime(); LogMovement(context, linen.LinenId, "ReceiveWash", "รับผ้าเข้าเครื่องซัก", prevLoc, "โรงซัก (Laundry)"); shouldSave = true; }
                                break;
                            case "MODE_RESTOCK":
                                if ((linen.Status == "พร้อมใช้" || linen.Status == "Available") && linen.CurrentLocation == "คลังผ้า (Stock)") isDuplicate = true;
                                else { linen.Status = "พร้อมใช้"; finalStatus = "พร้อมใช้"; linen.CurrentLocation = "คลังผ้า (Stock)"; LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "คลังผ้า (Stock)"); shouldSave = true; }
                                break;
                            case "MODE_DISCARD":
                                if (linen.IsActive == false) isDuplicate = true;
                                else { linen.Status = "จำหน่ายออก"; finalStatus = "จำหน่ายออก"; linen.IsActive = false; linen.CurrentLocation = "จุดจำหน่าย (Disposal)"; LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "จุดจำหน่าย (Disposal)"); shouldSave = true; }
                                break;
                            case "MODE_DISPATCH":
                                if (linen.Status == "กำลังส่ง" && linen.CurrentLocation == "ระหว่างขนส่ง") isDuplicate = true;
                                else { linen.Status = "กำลังส่ง"; finalStatus = "กำลังส่ง"; linen.CurrentLocation = "ระหว่างขนส่ง"; LogMovement(context, linen.LinenId, "Dispatch", "กำลังขนส่งไปยังปลายทาง", prevLoc, "ระหว่างขนส่ง"); shouldSave = true; }
                                break;
                            default: // Normal
                                if (linen.CurrentLocation != readerName) {
                                    linen.CurrentLocation = readerName;
                                    shouldSave = true;
                                    if(linen.Status == "กำลังส่ง" || linen.Status == "Dispatch" || linen.Status == "ระหว่างขนส่ง") {
                                        linen.Status = "ถูกใช้งาน"; finalStatus = "ถูกใช้งาน (รับเข้า)"; LogMovement(context, linen.LinenId, "Receive", "รับผ้าจากการขนส่ง (Auto)", prevLoc, readerName);
                                    } else if(linen.Status == "พร้อมใช้" || linen.Status == "Available") {
                                        linen.Status = "ถูกใช้งาน"; finalStatus = "ถูกใช้งาน"; LogMovement(context, linen.LinenId, "Move", "นำผ้าไปใช้งาน", prevLoc, readerName);
                                    } else {
                                        LogMovement(context, linen.LinenId, "Move", "ย้ายตำแหน่ง", prevLoc, readerName);
                                    }
                                } else { isDuplicate = true; }
                                break;
                        }

                        // ✅ จบงาน -> สั่งไฟเขียว (Ready)
                        if (isDuplicate) {
                            Console.WriteLine($"🔁 [Duplicate] {rfid}");
                            // ซ้ำก็ให้เขียว (บอกว่าอ่านได้) หรือจะเหลืองกระพริบก็ได้ แต่เอาเขียวเพื่อความต่อเนื่อง
                            await TriggerLed(readerName, "GREEN"); 
                            await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = true });
                        }
                        else if (shouldSave) {
                            linen.UpdatedAt = ThaiTime();
                            await context.SaveChangesAsync();
                            Console.WriteLine($"✅ [Success] {rfid}");
                            await TriggerLed(readerName, "GREEN");
                            await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, location = linen.CurrentLocation, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = false });
                        }
                    }
                    else
                    {
                        Console.WriteLine($"❓ [Unknown] {rfid}");
                        // ไม่พบ -> ไฟแดง
                        await TriggerLed(readerName, "RED");
                        await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = "ไม่พบในระบบ", productName = "ไม่พบในระบบ", timestamp = ThaiTime(), isDuplicate = false });
                    }
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
                    // เช็คทุก 5 วินาที
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        
                        // ✅ Threshold = 30 วินาที
                        // ถ้าไม่มีการสแกน (UpdatedAt ไม่เปลี่ยน) เกิน 30 วิ -> สั่ง Sleep
                        var threshold = ThaiTime().AddSeconds(-30);
                        
                        // ✅ เพิ่มเงื่อนไข: หาเฉพาะเครื่องที่หมดเวลา และ "ยังไม่ได้อยู่ในโหมด SLEEP"
                        // เพื่อป้องกันการส่งคำสั่ง SLEEP ซ้ำๆ (Spamming)
                        var timeoutReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < threshold && r.CurrentMode != "SLEEP")
                            .ToListAsync(stoppingToken);

                        if (timeoutReaders.Any())
                        {
                            foreach (var reader in timeoutReaders)
                            {
                                // 1. สั่ง Hardware ให้หลับ
                                await SetSleepMode(reader.ReaderName, true);
                                Console.WriteLine($"💤 Reader {reader.ReaderName} Timeout (30s) -> SLEEP MODE");
                                
                                // 2. ✅ อัปเดต DB ว่าหลับแล้ว (CurrentMode = "SLEEP")
                                // Loop ครั้งหน้าจะไม่เข้าเงื่อนไข r.CurrentMode != "SLEEP" ทำให้หยุด Spam
                                reader.CurrentMode = "SLEEP";
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

    public class ScanPayload { public string? rfid { get; set; } }
    public class ReaderStatusDto { public string? ip { get; set; } public string? status { get; set; } }
}