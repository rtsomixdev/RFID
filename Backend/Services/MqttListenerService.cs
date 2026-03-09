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
using Microsoft.Extensions.Configuration; 

namespace Backend.Services
{
    /// <summary>
    /// เก็บสถานะการทำงานปัจจุบันและการประวิงเวลาของเครื่องอ่านแต่ละตัว
    /// </summary>
    public class ReaderRuntimeState
    {
        public DateTime? ScanningUntil { get; set; } 
        public bool IsScanningActive => ScanningUntil.HasValue && DateTime.UtcNow.AddHours(7) <= ScanningUntil.Value;
        
        public DateTime LastActivityTime { get; set; } = DateTime.MinValue; 
        public DateTime LastCommandSentTime { get; set; } = DateTime.MinValue; 
        
        public DateTime LastWakeCommandSent { get; set; } = DateTime.MinValue;
        public DateTime LastSleepCommandSent { get; set; } = DateTime.MinValue;
    }

    /// <summary>
    /// บริการรันระดับพื้นหลังรับฟังสัญญานจากเครื่องอ่าน RFID และเชื่อมต่อผ่าน MQTT
    /// </summary>
    public class MqttListenerService : BackgroundService
    {
        private IManagedMqttClient? _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly MqttPublisherService _mqttPublisher; 
        private readonly IConfiguration _configuration; 

        private static ConcurrentDictionary<string, ReaderRuntimeState> _readerStates = new();
        
        // 🚀 [ป้องกัน CPU 1000%] เกราะป้องกันสแปม: จดจำแท็กที่เพิ่งสแกนเพื่อบล็อกการยิง DB ซ้ำซ้อน
        private static readonly ConcurrentDictionary<string, DateTime> _recentScans = new();
        private static readonly TimeSpan ScanCooldown = TimeSpan.FromSeconds(3); // หน่วงเวลาแท็กเดิม 3 วินาที

        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        private const string GPIO_GREEN = "12";
        private const string GPIO_YELLOW = "13";
        private const string GPIO_RED = "14";

        public MqttListenerService(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hubContext, MqttPublisherService mqttPublisher, IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _mqttPublisher = mqttPublisher;
            _configuration = configuration;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        private bool IsInOperatingHours(Reader reader, DateTime currentTime)
        {
            string? days = reader.OperatingDays;
            string? startStr = reader.OperatingStartTime?.ToString();
            string? endStr = reader.OperatingEndTime?.ToString();

            if (string.IsNullOrEmpty(days) && string.IsNullOrEmpty(startStr) && string.IsNullOrEmpty(endStr)) return true; 

            if (days == "Mon-Fri")
            {
                var day = currentTime.DayOfWeek;
                if (day == DayOfWeek.Saturday || day == DayOfWeek.Sunday) return false;
            }

            if (TimeSpan.TryParse(startStr, out TimeSpan start) && TimeSpan.TryParse(endStr, out TimeSpan end))
            {
                var now = currentTime.TimeOfDay;
                if (start <= end) return now >= start && now <= end;
                else return now >= start || now <= end; 
            }
            return true;
        }

        private async Task TriggerLed(string readerName, string color)
        {
            string gpio = color switch
            {
                "GREEN" => GPIO_GREEN, "YELLOW" => GPIO_YELLOW, "RED" => GPIO_RED, _ => GPIO_GREEN
            };
            await _mqttPublisher.PublishCommandAsync(readerName, "LED", gpio, true);
        }

        private async Task SetSleepMode(string readerName, bool sleep)
        {
            string cmd = sleep ? "SLEEP" : "WAKE";
            string exactTopic = $"reader/{readerName}/command";
            string payload = JsonSerializer.Serialize(new { cmd = cmd, val = "" });
            
            var state = _readerStates.GetOrAdd(readerName, _ => new ReaderRuntimeState());
            state.LastCommandSentTime = ThaiTime(); 
            
            if (!sleep) 
            {
                 state.LastWakeCommandSent = ThaiTime();
                 state.LastActivityTime = ThaiTime(); 
            }
            else
            {
                 state.LastSleepCommandSent = ThaiTime();
            }

            await _mqttPublisher.PublishRawMessageAsync(exactTopic, payload, false);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var mqttFactory = new MqttFactory();
            string mqttHost = _configuration["MqttConfig:Server"] ?? "localhost";
            int mqttPort = int.TryParse(_configuration["MqttConfig:Port"], out int port) ? port : 1883;

            var mqttClientOptions = new MqttClientOptionsBuilder()
                .WithClientId("Backend_Service_Main_" + Guid.NewGuid().ToString())
                .WithTcpServer(mqttHost, mqttPort) 
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
                    await _mqttClient.SubscribeAsync("reader/+/command"); 
                }
            };

            _mqttClient.ApplicationMessageReceivedAsync += e =>
            {
                _ = Task.Run(async () => await ProcessMessage(e));
                return Task.CompletedTask;
            };

            await _mqttClient.StartAsync(managedMqttClientOptions);
            _ = MonitorOfflineNodes(stoppingToken); 
            _ = CleanUpMemoryCache(stoppingToken); // 🚀 รันระบบทำความสะอาดแรมเบื้องหลัง

            while (!stoppingToken.IsCancellationRequested) await Task.Delay(1000, stoppingToken);
        }

        private async Task ProcessMessage(MqttApplicationMessageReceivedEventArgs e)
        {
            var topic = e.ApplicationMessage.Topic;
            var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            var parts = topic.Split('/');
            
            string readerName = (parts.Length >= 2) ? parts[1].Trim() : "Unknown";
            var now = ThaiTime();
            var state = _readerStates.GetOrAdd(readerName, _ => new ReaderRuntimeState());

            if (topic.EndsWith("/command"))
            {
                try {
                    var cmdData = JsonSerializer.Deserialize<CommandPayload>(payloadStr, _jsonOptions);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        
                        if (cmdData?.cmd == "WAKE" && reader != null && !IsInOperatingHours(reader, now))
                        {
                            Console.WriteLine($"🚫 [BLOCKED] Web WAKE rejected for {readerName} (Outside hours).");
                            await SetSleepMode(readerName, true); 
                            return; 
                        }

                        if (cmdData?.cmd == "WAKE" || cmdData?.cmd == "SLEEP") {
                            state.LastActivityTime = now; 
                            state.LastCommandSentTime = now;
                            if (cmdData?.cmd == "WAKE") state.LastWakeCommandSent = now;
                            if (cmdData?.cmd == "SLEEP") state.LastSleepCommandSent = now;
                        }
                    }
                } catch {}
                return;
            }

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
                            bool stateChanged = false; 

                            if (!string.IsNullOrEmpty(statusData?.ip) && statusData.ip != "-") 
                                reader.IpAddress = statusData.ip;

                            if (reader.IsActive == false || reader.IsActive == null)
                            {
                                reader.IsActive = true; 
                                stateChanged = true;
                            }

                            bool isRecentlyCommanded = (now - state.LastCommandSentTime).TotalSeconds < 10;

                            if (statusData?.source == "button")
                            {
                                if (!IsInOperatingHours(reader, now))
                                {
                                    await SetSleepMode(readerName, true);
                                    return; 
                                }
                                await SetSleepMode(readerName, false); 
                                if (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดปกติ (Normal)"; 
                                    stateChanged = true;
                                }
                            }
                            else if (!isRecentlyCommanded)
                            {
                                if (statusData?.status == "active" && (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)"))
                                {
                                    reader.CurrentMode = "โหมดปกติ (Normal)"; 
                                    stateChanged = true;
                                }
                                else if (statusData?.status == "sleep" && reader.CurrentMode != "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดหลับ (SLEEP)"; 
                                    stateChanged = true;
                                }
                            }

                            // 🚀 อัปเดตลง DB เฉพาะสถานะเปลี่ยน หรือห่างเกิน 15 วินาที เพื่อลดภาระ DB
                            if (stateChanged || (now - (reader.UpdatedAt ?? DateTime.MinValue)).TotalSeconds > 15)
                            {
                                reader.UpdatedAt = now; 
                                await context.SaveChangesAsync();
                                if (stateChanged) await _hubContext.Clients.All.SendAsync("OnModeChanged");
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ Heartbeat Error: {ex.Message}"); }
                return;
            }

            if (topic.EndsWith("/scan"))
            {
                try
                {
                    List<string> rawRfidTags = new List<string>();

                    if (payloadStr.Trim().StartsWith("{")) 
                    {
                        try {
                            var data = JsonSerializer.Deserialize<ScanBatchPayload>(payloadStr, _jsonOptions);
                            if (data?.rfid_tags != null && data.rfid_tags.Count > 0) rawRfidTags.AddRange(data.rfid_tags);
                            else if (!string.IsNullOrEmpty(data?.rfid)) rawRfidTags.Add(data.rfid);
                        } catch {}
                    }
                    else {
                        rawRfidTags.Add(payloadStr.Trim());
                    }

                    // 🚀 [ป้องกันสแปม] กรองแท็กซ้ำภายในเวลา 3 วินาที เพื่อไม่ให้ระบบต้องทำงานซ้ำซ้อน
                    var rfidTagsToProcess = new List<string>();
                    foreach (var rfid in rawRfidTags.Distinct())
                    {
                        if (string.IsNullOrEmpty(rfid)) continue;
                        string cacheKey = $"{readerName}_{rfid}";

                        if (_recentScans.TryGetValue(cacheKey, out var lastSeen))
                        {
                            if ((now - lastSeen) < ScanCooldown) continue; // ข้ามเงียบๆ ทันที
                        }

                        _recentScans[cacheKey] = now; 
                        rfidTagsToProcess.Add(rfid);
                    }

                    // ถ้ากรองสแปมแล้วไม่เหลืออะไรเลย ให้หยุดประมวลผลทันที
                    if (rfidTagsToProcess.Count == 0) return;

                    // 💡 [แก้ไข] สร้างตัวแปรเก็บ Payload แบบมีโครงสร้างชัดเจน (ป้องกัน CS1973 Compiler Error)
                    bool triggerModeChange = false;
                    object? modeChangePayload = null;
                    var scanResultsToBroadcast = new List<ScanResultDto>();

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var readerDB = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);

                        if (readerDB != null && !IsInOperatingHours(readerDB, now))
                        {
                            await TriggerLed(readerName, "RED"); 
                            await SetSleepMode(readerName, true); 
                            return; 
                        }

                        await TriggerLed(readerName, "YELLOW");

                        if (readerDB != null) {
                            bool stateChanged = false;
                            readerDB.UpdatedAt = now; 

                            if (readerDB.IsActive == false || readerDB.IsActive == null) {
                                readerDB.IsActive = true;
                                stateChanged = true;
                            }

                            if (readerDB.CurrentMode == "SLEEP" || readerDB.CurrentMode == "โหมดหลับ (SLEEP)") {
                                 readerDB.CurrentMode = "โหมดปกติ (Normal)";
                                 stateChanged = true;
                                 state.LastCommandSentTime = now; 
                            }

                            if (stateChanged) triggerModeChange = true;
                        }

                        string currentMode = readerDB?.CurrentMode ?? "โหมดปกติ (Normal)";
                        string? overrideModeForBatch = null;
                        List<string> regularTagsInBatch = new List<string>();

                        foreach (var rfid in rfidTagsToProcess)
                        {
                            var specialTag = await context.SpecialTags.FindAsync(rfid);
                            if (specialTag != null) {
                                if (overrideModeForBatch == null) overrideModeForBatch = specialTag.CommandType; 
                            }
                            else regularTagsInBatch.Add(rfid);
                        }

                        if (overrideModeForBatch != null)
                        {
                            currentMode = overrideModeForBatch;
                            if(readerDB != null) {
                                readerDB.CurrentMode = currentMode;
                            }
                            triggerModeChange = true;
                            modeChangePayload = new { reader = readerName, mode = currentMode };
                            await TriggerLed(readerName, "GREEN");
                        }

                        bool anyChangesToSave = false; 

                        // 🚀 [แก้ N+1 Query] ดึงข้อมูลผ้าทั้งหมดในตู้รอบเดียว แทนการดึงทีละชิ้นในลูป
                        var foundLinens = await context.Linens
                            .Include(l => l.Product)
                            .Where(l => regularTagsInBatch.Contains(l.RfidCode))
                            .ToListAsync();

                        foreach (var rfid in regularTagsInBatch)
                        {
                            var linen = foundLinens.FirstOrDefault(l => l.RfidCode == rfid);
                            
                            if (linen != null)
                            {
                                bool isDuplicate = false;
                                bool shouldSave = false;
                                string prevLoc = linen.CurrentLocation ?? "ไม่ระบุ";
                                string finalStatus = TranslateStatus(linen.Status ?? ""); 

                                string targetLocation = readerName; 
                                if (readerDB != null && !string.IsNullOrEmpty(readerDB.Location)) targetLocation = readerDB.Location; 

                                switch (currentMode)
                                {
                                    case "ส่งผ้าซัก": case "โหมดส่งซัก": case "MODE_WASH": 
                                        if (linen.Status == "ส่งซัก" || linen.Status == "SendingToLaundry") isDuplicate = true;
                                        else { linen.Status = "ส่งซัก"; finalStatus = "ส่งซัก"; linen.CurrentLocation = "จุดพักผ้ารอซัก"; LogMovement(context, linen.LinenId, "SendToWash", "ส่งผ้าออกจากวอร์ด (รอรับ)", prevLoc, "จุดพักผ้ารอซัก"); shouldSave = true; }
                                        break;

                                    case "ส่งซักซ้ำ": case "โหมดส่งซักซ้ำ": case "MODE_REWASH":
                                        if (linen.Status == "ส่งซักซ้ำ" || linen.Status == "ReWash") isDuplicate = true;
                                        else { linen.Status = "ส่งซักซ้ำ"; finalStatus = "ส่งซักซ้ำ"; linen.CurrentLocation = "จุดพักผ้ารอซัก"; LogMovement(context, linen.LinenId, "ReWash", "ส่งผ้ากลับไปซักใหม่ (พบรอยเปื้อน)", prevLoc, "จุดพักผ้ารอซัก"); shouldSave = true; }
                                        break;

                                    case "กำลังซัก": case "รับผ้าซัก": case "MODE_RECEIVE_LAUNDRY": 
                                        if (linen.Status == "กำลังซัก" || linen.Status == "Washing") isDuplicate = true;
                                        else { 
                                            linen.Status = "กำลังซัก"; finalStatus = "กำลังซัก"; linen.CurrentLocation = "โรงซัก"; linen.WashCount++; linen.LastWashDate = ThaiTime(); 
                                            LogMovement(context, linen.LinenId, "ReceiveWash", "รับผ้าเข้าเครื่องซัก", prevLoc, "โรงซัก"); shouldSave = true; 
                                        }
                                        break;

                                    case "รับกลับเข้าคลัง": case "โหมดรับเข้าคลัง": case "MODE_RESTOCK":
                                        if ((linen.Status == "พร้อมใช้" || linen.Status == "Available") && linen.CurrentLocation == "คลังผ้าสะอาด") isDuplicate = true;
                                        else { 
                                            linen.Status = "พร้อมใช้"; finalStatus = "พร้อมใช้"; linen.CurrentLocation = "คลังผ้าสะอาด"; 
                                            LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "คลังผ้าสะอาด"); shouldSave = true; 
                                        }
                                        break;

                                    case "จำหน่ายออก": case "MODE_DISCARD":
                                        if (linen.IsActive == false) isDuplicate = true;
                                        else { linen.Status = "จำหน่ายออก"; finalStatus = "จำหน่ายออก"; linen.IsActive = false; linen.CurrentLocation = "จุดจำหน่าย"; LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "จุดจำหน่าย"); shouldSave = true; }
                                        break;

                                    case "กำลังจัดส่ง": case "โหมดส่งไปยังวอร์ด": case "MODE_DISPATCH":
                                        if (linen.Status == "กำลังส่ง" && linen.CurrentLocation == "ระหว่างขนส่ง") isDuplicate = true;
                                        else { linen.Status = "กำลังส่ง"; finalStatus = "กำลังส่ง"; linen.CurrentLocation = "ระหว่างขนส่ง"; LogMovement(context, linen.LinenId, "Dispatch", "กำลังขนส่งไปยังปลายทาง", prevLoc, "ระหว่างขนส่ง"); shouldSave = true; }
                                        break;

                                    default: 
                                        if (linen.CurrentLocation != targetLocation) {
                                            linen.CurrentLocation = targetLocation;  shouldSave = true;
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
                                    scanResultsToBroadcast.Add(new ScanResultDto { 
                                        rfid = rfid, reader = readerName, mode = currentMode, status = finalStatus, 
                                        productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = true 
                                    });
                                }
                                else if (shouldSave) {
                                    linen.UpdatedAt = ThaiTime();
                                    anyChangesToSave = true; 
                                    scanResultsToBroadcast.Add(new ScanResultDto { 
                                        rfid = rfid, reader = readerName, mode = currentMode, status = finalStatus, 
                                        location = linen.CurrentLocation, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = false 
                                    });
                                }
                            }
                            else
                            {
                                scanResultsToBroadcast.Add(new ScanResultDto { 
                                    rfid = rfid, reader = readerName, mode = currentMode, status = "ไม่พบในระบบ", 
                                    productName = "ไม่พบในระบบ", timestamp = ThaiTime(), isDuplicate = false 
                                });
                            }
                        }

                        // บันทึกลงฐานข้อมูลรวดเดียว
                        if (anyChangesToSave || triggerModeChange)
                        {
                            await context.SaveChangesAsync();
                        }
                        await TriggerLed(readerName, "GREEN");

                    } // 🚀 ปิด Connection DB ให้เรียบร้อย ก่อนไปส่ง Network

                    // 💡 [แก้ไข] สาดข้อมูลให้หน้าเว็บรวดเดียว แบบระบุ Type ชัดเจนไม่ใช้ dynamic แล้ว (ผ่านฉลุย C# Compiler)
                    if (triggerModeChange) {
                        if (modeChangePayload != null) await _hubContext.Clients.All.SendAsync("OnModeChanged", modeChangePayload);
                        else await _hubContext.Clients.All.SendAsync("OnModeChanged");
                    }

                    foreach (var scanResult in scanResultsToBroadcast)
                    {
                        await _hubContext.Clients.All.SendAsync("OnScan", scanResult);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Scan Process Error: {ex.Message}");
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

        private async Task MonitorOfflineNodes(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var now = ThaiTime();
                        bool needUpdate = false;

                        var readers = await context.Readers.ToListAsync(stoppingToken);

                        foreach (var reader in readers)
                        {
                            if (reader.IsActive == true && (now - (reader.UpdatedAt ?? DateTime.MinValue)).TotalSeconds > 20)
                            {
                                reader.IsActive = false; 
                                needUpdate = true;
                                continue; 
                            }

                            if (reader.IsActive == true)
                            {
                                var state = _readerStates.GetOrAdd(reader.ReaderName, _ => new ReaderRuntimeState { LastActivityTime = now });
                                
                                bool isOperatingTime = IsInOperatingHours(reader, now);
                                bool isCurrentlySleeping = (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)");
                                
                                double secondsSinceLastActivity = (now - state.LastActivityTime).TotalSeconds;

                                if (!isOperatingTime)
                                {
                                    if (!isCurrentlySleeping)
                                    {
                                        await SetSleepMode(reader.ReaderName, true);
                                        reader.CurrentMode = "โหมดหลับ (SLEEP)";
                                        reader.UpdatedAt = now; 
                                        needUpdate = true;
                                    }
                                }
                                else
                                {
                                    if (!isCurrentlySleeping && secondsSinceLastActivity > 30)
                                    {
                                        if ((now - state.LastSleepCommandSent).TotalSeconds > 10) 
                                        {
                                            await SetSleepMode(reader.ReaderName, true);
                                            reader.CurrentMode = "โหมดหลับ (SLEEP)";
                                            reader.UpdatedAt = now; 
                                            needUpdate = true;
                                        }
                                    }
                                }
                            }
                        }

                        if (needUpdate)
                        {
                            await context.SaveChangesAsync(stoppingToken);
                            await _hubContext.Clients.All.SendAsync("OnModeChanged");
                        }
                    }
                }
                catch { }
            }
        }

        // 🚀 คอยเคลียร์ขยะใน Memory (ตัวกรองสแปม) ป้องกันแรมรั่ว
        private async Task CleanUpMemoryCache(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                var now = ThaiTime();
                
                foreach (var key in _recentScans.Keys.ToList())
                {
                    if (_recentScans.TryGetValue(key, out var lastSeen))
                    {
                        if ((now - lastSeen).TotalMinutes > 1) 
                        {
                            _recentScans.TryRemove(key, out _); 
                        }
                    }
                }
            }
        }

        public override void Dispose()
        {
            _mqttClient?.Dispose();
            base.Dispose();
        }
    }

    public class CommandPayload { public string? cmd { get; set; } }
    public class ScanPayload { public string? rfid { get; set; } }
    public class ScanBatchPayload { public string? reader_id { get; set; } public List<string>? rfid_tags { get; set; } public string? rfid { get; set; } }
    public class ReaderStatusDto { public string? ip { get; set; } public string? status { get; set; } public string? source { get; set; } }
    
    // 💡 [แก้ไข] คลาสใหม่สำหรับเก็บข้อมูล SignalR แบบระบุ Type (ป้องกัน CS1973)
    public class ScanResultDto { 
        public string? rfid { get; set; } 
        public string? reader { get; set; } 
        public string? mode { get; set; } 
        public string? status { get; set; } 
        public string? location { get; set; } 
        public string? productName { get; set; } 
        public DateTime timestamp { get; set; } 
        public bool isDuplicate { get; set; } 
    }
}