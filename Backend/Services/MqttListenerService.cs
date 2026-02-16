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

        // Helper สั่งเปิดไฟ LED ตาม GPIO
        private async Task TriggerLed(string readerName, string color)
        {
            string gpio = color switch
            {
                "GREEN" => GPIO_GREEN,
                "YELLOW" => GPIO_YELLOW,
                "RED" => GPIO_RED,
                _ => GPIO_GREEN
            };

            // ส่ง Command ไปที่ Topic: reader/{readerName}/command
            await _mqttPublisher.PublishCommandAsync(readerName, "LED", gpio, true);
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
            // 🟢 CASE A: Status Heartbeat
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
                            // ✅ แก้ไขจุดที่ Error CS0266 ตรงนี้ครับ
                            // ใช้ ?? false เพื่อแปลง null เป็น false ก่อนใส่เครื่องหมาย !
                            bool wasOffline = !(reader.IsActive ?? false);
                            
                            reader.IsActive = true; 
                            reader.UpdatedAt = ThaiTime(); 
                            if (statusData?.ip != null) reader.IpAddress = statusData.ip;
                            await context.SaveChangesAsync();

                            // ถ้าเพิ่ง Online กลับมา -> สั่งไฟเขียว (GPIO 12)
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
                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                    
                    string rfid = payloadStr;
                    if (payloadStr.Trim().StartsWith("{"))
                    {
                        try {
                            var data = JsonSerializer.Deserialize<ScanPayload>(payloadStr, _jsonOptions);
                            rfid = data?.rfid ?? "";
                        } catch { /* Ignore */ }
                    }
                    if (string.IsNullOrEmpty(rfid)) return;

                    var readerDB = await context.Readers.AsNoTracking().FirstOrDefaultAsync(r => r.ReaderName == readerName);
                    
                    string currentMode = "Normal";
                    if (readerDB == null) {
                        Console.WriteLine($"⚠️ [WARNING] Reader '{readerName}' not found in DB! Using Normal mode.");
                    } else {
                        currentMode = readerDB.CurrentMode ?? "Normal";
                    }

                    if (!_readerStates.ContainsKey(readerName)) {
                        _readerStates[readerName] = new ReaderRuntimeState();
                    }
                    var state = _readerStates[readerName];

                    // 1. เช็ค Special Tag (เปลี่ยนโหมด)
                    var specialTag = await context.SpecialTags.FindAsync(rfid);
                    if (specialTag != null)
                    {
                        currentMode = specialTag.CommandType;
                        
                        if (currentMode == "Normal") {
                            state.ScanningUntil = null;
                            // กลับสู่โหมดปกติ -> 🟢 ไฟเขียว (GPIO 12)
                            await TriggerLed(readerName, "GREEN");
                        } else {
                            state.ScanningUntil = ThaiTime().AddSeconds(30); 
                            // เข้าโหมดทำงาน -> 🟡 ไฟเหลือง (GPIO 13)
                            await TriggerLed(readerName, "YELLOW");
                        }
                        
                        var readerToUpdate = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if(readerToUpdate != null) {
                            readerToUpdate.CurrentMode = currentMode;
                            await context.SaveChangesAsync();
                        }

                        Console.WriteLine($"🎛 [Mode Change] {readerName} -> {currentMode}");
                        await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                        return;
                    }

                    // 2. เช็ค Timeout
                    if (currentMode != "Normal" && state.ScanningUntil.HasValue && !state.IsScanningActive)
                    {
                        Console.WriteLine($"⛔ [Timeout] {readerName} reset to Normal.");
                        // หมดเวลา -> 🟢 ไฟเขียว (GPIO 12)
                        await TriggerLed(readerName, "GREEN");
                        currentMode = "Normal";
                        
                        var readerToUpdate = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if(readerToUpdate != null) {
                            readerToUpdate.CurrentMode = "Normal";
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
                                else {
                                    linen.Status = "ส่งซัก";
                                    finalStatus = "ส่งซัก";
                                    linen.CurrentLocation = "จุดรอรับ (Transit)"; 
                                    LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "จุดรอรับ (Transit)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_RECEIVE_LAUNDRY": 
                                if (linen.Status == "กำลังซัก" || linen.Status == "Washing") isDuplicate = true;
                                else {
                                    linen.Status = "กำลังซัก";
                                    finalStatus = "กำลังซัก";
                                    linen.CurrentLocation = "โรงซัก (Laundry)";
                                    linen.WashCount++; 
                                    linen.LastWashDate = ThaiTime();
                                    LogMovement(context, linen.LinenId, "ReceiveWash", "รับผ้าเข้าเครื่องซัก", prevLoc, "โรงซัก (Laundry)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_RESTOCK":
                                if ((linen.Status == "พร้อมใช้" || linen.Status == "Available") && linen.CurrentLocation == "คลังผ้า (Stock)") isDuplicate = true;
                                else {
                                    linen.Status = "พร้อมใช้";
                                    finalStatus = "พร้อมใช้";
                                    linen.CurrentLocation = "คลังผ้า (Stock)";
                                    LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "คลังผ้า (Stock)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_DISCARD":
                                if (linen.IsActive == false) isDuplicate = true;
                                else {
                                    linen.Status = "จำหน่ายออก";
                                    finalStatus = "จำหน่ายออก";
                                    linen.IsActive = false; 
                                    linen.CurrentLocation = "จุดจำหน่าย (Disposal)";
                                    LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "จุดจำหน่าย (Disposal)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_DISPATCH":
                                if (linen.Status == "กำลังส่ง" && linen.CurrentLocation == "ระหว่างขนส่ง") isDuplicate = true;
                                else {
                                    linen.Status = "กำลังส่ง";
                                    finalStatus = "กำลังส่ง";
                                    linen.CurrentLocation = "ระหว่างขนส่ง";
                                    LogMovement(context, linen.LinenId, "Dispatch", "กำลังขนส่งไปยังปลายทาง", prevLoc, "ระหว่างขนส่ง");
                                    shouldSave = true;
                                }
                                break;
                                
                            // 🟢 CASE NORMAL (Tracking & Receiving)
                            default: // "Normal"
                                if (linen.CurrentLocation != readerName)
                                {
                                    linen.CurrentLocation = readerName;
                                    shouldSave = true;

                                    if(linen.Status == "กำลังส่ง" || linen.Status == "Dispatch" || linen.Status == "ระหว่างขนส่ง") 
                                    {
                                        linen.Status = "ถูกใช้งาน"; 
                                        finalStatus = "ถูกใช้งาน (รับเข้า)";
                                        LogMovement(context, linen.LinenId, "Receive", "รับผ้าจากการขนส่ง (Auto)", prevLoc, readerName);
                                    }
                                    else if(linen.Status == "พร้อมใช้" || linen.Status == "Available") 
                                    {
                                        linen.Status = "ถูกใช้งาน";
                                        finalStatus = "ถูกใช้งาน";
                                        LogMovement(context, linen.LinenId, "Move", "นำผ้าไปใช้งาน", prevLoc, readerName);
                                    }
                                    else 
                                    {
                                        LogMovement(context, linen.LinenId, "Move", "ย้ายตำแหน่ง", prevLoc, readerName);
                                    }
                                }
                                else
                                {
                                    isDuplicate = true;
                                }
                                break;
                        }

                        if (isDuplicate)
                        {
                            Console.WriteLine($"🔁 [Duplicate] {rfid} ({linen.Status})");
                            // 🟡 สแกนซ้ำ -> ไฟเหลือง (GPIO 13)
                            await TriggerLed(readerName, "YELLOW");
                            
                            await _hubContext.Clients.All.SendAsync("OnScan", new { 
                                rfid = rfid, 
                                reader = readerName, 
                                mode = currentMode,
                                status = finalStatus, 
                                productName = linen.Product?.ProductName,
                                timestamp = ThaiTime(),
                                isDuplicate = true 
                            });
                        }
                        else if (shouldSave)
                        {
                            linen.UpdatedAt = ThaiTime();
                            await context.SaveChangesAsync();
                            
                            Console.WriteLine($"✅ [Success] {rfid} status -> {finalStatus}");
                            // 🟢 สำเร็จ -> ไฟเขียว (GPIO 12)
                            await TriggerLed(readerName, "GREEN");

                            await _hubContext.Clients.All.SendAsync("OnScan", new { 
                                rfid = rfid, 
                                reader = readerName, 
                                mode = currentMode,
                                status = finalStatus, 
                                location = linen.CurrentLocation,
                                productName = linen.Product?.ProductName,
                                timestamp = ThaiTime(),
                                isDuplicate = false
                            });
                        }
                    }
                    else
                    {
                        Console.WriteLine($"❓ [Unknown] {rfid}");
                        // 🔴 ไม่พบ -> ไฟแดง (GPIO 27)
                        await TriggerLed(readerName, "RED");
                        
                        await _hubContext.Clients.All.SendAsync("OnScan", new { 
                            rfid = rfid, 
                            reader = readerName, 
                            mode = currentMode, 
                            status = "ไม่พบในระบบ", 
                            productName = "ไม่พบในระบบ",
                            timestamp = ThaiTime(),
                            isDuplicate = false
                        });
                    }
                }
            }
        }

        private string TranslateStatus(string status)
        {
            if (string.IsNullOrEmpty(status)) return "ไม่ระบุ";
            switch (status)
            {
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
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var threshold = ThaiTime().AddMinutes(-2);
                        var offlineReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < threshold)
                            .ToListAsync(stoppingToken);

                        if (offlineReaders.Any())
                        {
                            foreach (var reader in offlineReaders) reader.IsActive = false;
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