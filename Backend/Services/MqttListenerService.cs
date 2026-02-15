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

        public MqttListenerService(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hubContext, MqttPublisherService mqttPublisher)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _mqttPublisher = mqttPublisher;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

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
                            reader.IsActive = true; 
                            reader.UpdatedAt = ThaiTime(); 
                            if (statusData?.ip != null) reader.IpAddress = statusData.ip;
                            await context.SaveChangesAsync();
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

                    // 1. เช็ค Special Tag
                    var specialTag = await context.SpecialTags.FindAsync(rfid);
                    if (specialTag != null)
                    {
                        currentMode = specialTag.CommandType;
                        state.ScanningUntil = ThaiTime().AddSeconds(30); 
                        
                        var readerToUpdate = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if(readerToUpdate != null) {
                            readerToUpdate.CurrentMode = currentMode;
                            await context.SaveChangesAsync();
                        }

                        Console.WriteLine($"🎛 [Mode Change] {readerName} -> {currentMode}");
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "YELLOW", true);
                        await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                        return;
                    }

                    // 2. เช็ค Timeout
                    if (currentMode != "Normal" && !state.IsScanningActive)
                    {
                        Console.WriteLine($"⛔ [Timeout] {readerName} reset to Normal.");
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "RED", true);
                        currentMode = "Normal";
                        
                        var readerToUpdate = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if(readerToUpdate != null) {
                            readerToUpdate.CurrentMode = "Normal";
                            await context.SaveChangesAsync();
                        }
                        return; 
                    }

                    // 3. ประมวลผลผ้า
                    var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                    
                    if (linen != null)
                    {
                        bool isDuplicate = false;
                        bool shouldSave = false;
                        string prevLoc = linen.CurrentLocation ?? "ไม่ระบุ";
                        // แปลงสถานะเป็นภาษาไทย
                        string finalStatus = TranslateStatus(linen.Status); 

                        Console.WriteLine($"🔍 Processing {rfid} | Reader: '{readerName}' | ModeDB: {currentMode} | Status: {linen.Status}");

                        switch (currentMode)
                        {
                            case "MODE_WASH":
                                if (linen.Status == "ส่งซัก" || linen.Status == "SendingToLaundry") isDuplicate = true;
                                else {
                                    linen.Status = "ส่งซัก";
                                    finalStatus = "ส่งซัก";
                                    linen.CurrentLocation = "ขนส่ง (Transit)"; 
                                    LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "ขนส่ง (Transit)");
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

                            // ✅ เพิ่มโหมดใหม่
                            case "MODE_REPAIR":
                                if (linen.Status == "ส่งซ่อม") isDuplicate = true;
                                else {
                                    linen.Status = "ส่งซ่อม";
                                    finalStatus = "ส่งซ่อม";
                                    linen.CurrentLocation = "แผนกซ่อมบำรุง";
                                    LogMovement(context, linen.LinenId, "Repair", "ส่งซ่อมผ้าชำรุด", prevLoc, "แผนกซ่อมบำรุง");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_QC":
                                // ไม่เปลี่ยน Status แต่บันทึก Log ว่ามีการตรวจเช็ค
                                finalStatus = "ตรวจสอบคุณภาพ (QC)";
                                LogMovement(context, linen.LinenId, "QC", "ตรวจสอบคุณภาพผ้า", prevLoc, readerName);
                                shouldSave = true; // บันทึก timestamp การตรวจเช็ค
                                break;

                            case "MODE_DISPATCH_WARD":
                                if (linen.Status == "ถูกใช้งาน" && linen.CurrentLocation == "หอผู้ป่วย") isDuplicate = true;
                                else {
                                    linen.Status = "ถูกใช้งาน";
                                    finalStatus = "ถูกใช้งาน (Ward)";
                                    linen.CurrentLocation = "หอผู้ป่วย (Ward)";
                                    LogMovement(context, linen.LinenId, "Dispatch", "ส่งผ้าไปหอผู้ป่วย", prevLoc, "หอผู้ป่วย (Ward)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_DISPATCH_OR":
                                if (linen.Status == "ถูกใช้งาน" && linen.CurrentLocation == "ห้องผ่าตัด") isDuplicate = true;
                                else {
                                    linen.Status = "ถูกใช้งาน";
                                    finalStatus = "ถูกใช้งาน (OR)";
                                    linen.CurrentLocation = "ห้องผ่าตัด (OR)";
                                    LogMovement(context, linen.LinenId, "Dispatch", "ส่งผ้าไปห้องผ่าตัด", prevLoc, "ห้องผ่าตัด (OR)");
                                    shouldSave = true;
                                }
                                break;

                            case "MODE_TRANSFER":
                                // แค่ย้าย Location แต่ Status เดิม
                                linen.CurrentLocation = readerName + " (Transfer)";
                                finalStatus = "โอนย้าย";
                                LogMovement(context, linen.LinenId, "Transfer", "โอนย้ายระหว่างคลัง", prevLoc, linen.CurrentLocation);
                                shouldSave = true;
                                break;
                                
                            default: // Normal Mode
                                if (linen.CurrentLocation == readerName) isDuplicate = true;
                                else {
                                    linen.CurrentLocation = readerName;
                                    // ถ้าผ้าพร้อมใช้ ถูกสแกนที่จุดอื่น ให้ถือว่าถูกใช้งาน
                                    if(linen.Status == "พร้อมใช้" || linen.Status == "Available") {
                                        linen.Status = "ถูกใช้งาน";
                                        finalStatus = "ถูกใช้งาน";
                                    }
                                    LogMovement(context, linen.LinenId, "Move", "ย้ายตำแหน่ง", prevLoc, readerName);
                                    shouldSave = true;
                                }
                                break;
                        }

                        if (isDuplicate)
                        {
                            Console.WriteLine($"🔁 [Duplicate] {rfid} ({linen.Status})");
                            await _mqttPublisher.PublishCommandAsync(readerName, "LED", "YELLOW", false);
                            
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
                            await _mqttPublisher.PublishCommandAsync(readerName, "LED", "GREEN", true);

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
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "RED", true);
                        
                        await _hubContext.Clients.All.SendAsync("OnScan", new { 
                            rfid = rfid, 
                            reader = readerName, 
                            mode = currentMode, 
                            status = "ไม่พบในระบบ",
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
                case "Repair": return "ส่งซ่อม";
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