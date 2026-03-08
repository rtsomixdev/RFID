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

        /// <summary>
        /// ดึงเวลาปัจจุบันอ้างอิงตามเขตเวลาท้องถิ่น
        /// </summary>
        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        /// <summary>
        /// ฟังก์ชันเทียบเคียงการทำงานช่วงกรอบเวลาของเครื่องอ่านแต่ละตัว
        /// </summary>
        /// <param name="reader">ข้อมูลโมเดลเครื่องอ่านอุปกรณ์</param>
        /// <param name="currentTime">เวลาปัจจุบันตามการเคลื่อนไหว</param>
        /// <returns>สถานะจริงยืนยันการปฏิบัติการบนกรอบเวลา</returns>
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

        /// <summary>
        /// แจ้งคำสั่งกลับไปยังเครื่องอ่านเพื่อกะพริบไฟ LED บอกสถานะ
        /// </summary>
        /// <param name="readerName">รหัสเครื่องเป้าหมาย</param>
        /// <param name="color">คำสั่งยิงประกายสี</param>
        private async Task TriggerLed(string readerName, string color)
        {
            string gpio = color switch
            {
                "GREEN" => GPIO_GREEN, "YELLOW" => GPIO_YELLOW, "RED" => GPIO_RED, _ => GPIO_GREEN
            };
            await _mqttPublisher.PublishCommandAsync(readerName, "LED", gpio, true);
        }

        /// <summary>
        /// สั่งเปิดเผยสถานะประหยัดพลังงานหรือโหมดหลับพักการทำงานของบอร์ด
        /// </summary>
        /// <param name="readerName">ชื่ออ้างอิงโมดูลฮาร์ดแวร์ปลายทาง</param>
        /// <param name="sleep">ตัวปักธงควบคุมการนอนหลับ</param>
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
                 state.LastActivityTime = ThaiTime(); // รีเซ็ตเวลา 30 วินาที เฉพาะตอนตื่นครั้งแรก
            }
            else
            {
                 state.LastSleepCommandSent = ThaiTime();
            }

            await _mqttPublisher.PublishRawMessageAsync(exactTopic, payload, false);
        }

        /// <summary>
        /// ปฏิบัติการเฝ้าระวังและการเชื่อมต่อเป็นเซสชันผ่านทางโพรโทคอล MQTT
        /// </summary>
        /// <param name="stoppingToken">โทเคนสัญญาณปิดกั้นที่ร้องขอให้ระงับทำงาน</param>
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

            while (!stoppingToken.IsCancellationRequested) await Task.Delay(1000, stoppingToken);
        }

        /// <summary>
        /// แยกแยะและควบคุมกระแสข้อความที่ได้รับตามพฤติกรรมหรือหัวข้อ
        /// </summary>
        /// <param name="e">ข้อมูลแพ็คเก็ตประกอบเหตุการณ์การติดต่อ</param>
        private async Task ProcessMessage(MqttApplicationMessageReceivedEventArgs e)
        {
            var topic = e.ApplicationMessage.Topic;
            var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            var parts = topic.Split('/');
            
            string readerName = (parts.Length >= 2) ? parts[1].Trim() : "Unknown";
            var now = ThaiTime();
            var state = _readerStates.GetOrAdd(readerName, _ => new ReaderRuntimeState());

            // -----------------------------------------------------------
            // ส่วนที่ 1: ดักรับฟังคำขอคำสั่งจัดการผ่านส่วนต่อประสานกับผู้ใช้งาน Web (ปุ่ม WAKE)
            // -----------------------------------------------------------
            if (topic.EndsWith("/command"))
            {
                try {
                    var cmdData = JsonSerializer.Deserialize<CommandPayload>(payloadStr, _jsonOptions);
                    
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        
                        // 🛑 ถ้านอกเวลาทำงาน ไม่อนุญาตให้กดปุ่ม WAKE จากหน้าเว็บ
                        if (cmdData?.cmd == "WAKE" && reader != null && !IsInOperatingHours(reader, now))
                        {
                            Console.WriteLine($"🚫 [BLOCKED] Web WAKE rejected for {readerName} (Outside hours).");
                            await SetSleepMode(readerName, true); 
                            return; 
                        }

                        if (cmdData?.cmd == "WAKE" || cmdData?.cmd == "SLEEP") {
                            state.LastActivityTime = now; // <--- รีเซ็ตเวลานับ 30 วิ (ปุ่ม Web)
                            state.LastCommandSentTime = now;
                            if (cmdData?.cmd == "WAKE") state.LastWakeCommandSent = now;
                            if (cmdData?.cmd == "SLEEP") state.LastSleepCommandSent = now;
                        }
                    }
                } catch {}
                return;
            }

            // -----------------------------------------------------------
            // ส่วนที่ 2: แจ้งเตือนชีพจรการทำงาน (และจับสัญญาณปุ่มกดเชิงกายภาพฮาร์ดแวร์ ESP32)
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
                            bool stateChanged = false; 

                            if (!string.IsNullOrEmpty(statusData?.ip) && statusData.ip != "-") 
                                reader.IpAddress = statusData.ip;

                            if (reader.IsActive == false || reader.IsActive == null)
                            {
                                reader.IsActive = true; 
                                stateChanged = true;
                            }

                            reader.UpdatedAt = now; 
                            bool isRecentlyCommanded = (now - state.LastCommandSentTime).TotalSeconds < 10;

                            // 🚀 ดักจับการกดปุ่มจาก Hardware
                            if (statusData?.source == "button")
                            {
                                // 🛑 เช็คกฎเหล็ก: นอกเวลางานหรือไม่?
                                if (!IsInOperatingHours(reader, now))
                                {
                                    await SetSleepMode(readerName, true);
                                    Console.WriteLine($"🚫 [LOCKDOWN] HW Button pressed on {readerName} (Outside hours). Forced SLEEP.");
                                    return; 
                                }

                                // 🟢 อยู่ในเวลาทำงาน อนุญาตให้ตื่น
                                await SetSleepMode(readerName, false); // ⚡ ยิง WAKE ทันที (ฟังก์ชันนี้มี state.LastActivityTime = now; อยู่แล้ว)
                                Console.WriteLine($"🔘 [APPROVED] HW Button pressed! WAKE command sent to {readerName}.");

                                if (reader.CurrentMode == "SLEEP" || reader.CurrentMode == "โหมดหลับ (SLEEP)")
                                {
                                    reader.CurrentMode = "โหมดปกติ (Normal)"; 
                                    stateChanged = true;
                                }
                            }
                            // กรณีเป็น Heartbeat ปกติ
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

                            await context.SaveChangesAsync();
                            if (stateChanged) await _hubContext.Clients.All.SendAsync("OnModeChanged");
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ Heartbeat Error: {ex.Message}"); }
                return;
            }

            // -----------------------------------------------------------
            // ส่วนที่ 3: รับการบันทึกรายการชุดข้อมูลผ้าและป้ายพิเศษจากการสแกน RFID
            // -----------------------------------------------------------
            if (topic.EndsWith("/scan"))
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var readerDB = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);

                        // 🛑 กฎเหล็กขั้นสุดยอด: ถ้านอกเวลาทำงาน ห้ามสแกนผ้าเข้าเด็ดขาด!
                        if (readerDB != null && !IsInOperatingHours(readerDB, now))
                        {
                            Console.WriteLine($"🚫 [BLOCKED] Scan rejected for {readerName} (Outside hours).");
                            await TriggerLed(readerName, "RED"); 
                            await SetSleepMode(readerName, true); 
                            return; 
                        }

                        // ❌ เอา state.LastActivityTime = now; ออกไปแล้วครับ! การสแกนจะไม่บวกเวลาเพิ่มอีกต่อไป
                        await TriggerLed(readerName, "YELLOW");

                        List<string> rfidTagsToProcess = new List<string>();

                        if (payloadStr.Trim().StartsWith("{")) 
                        {
                            try {
                                var data = JsonSerializer.Deserialize<ScanBatchPayload>(payloadStr, _jsonOptions);
                                if (data?.rfid_tags != null && data.rfid_tags.Count > 0) rfidTagsToProcess.AddRange(data.rfid_tags);
                                else if (!string.IsNullOrEmpty(data?.rfid)) rfidTagsToProcess.Add(data.rfid);
                            } catch {}
                        }
                        else {
                            rfidTagsToProcess.Add(payloadStr.Trim());
                        }

                        if (rfidTagsToProcess.Count == 0) return;
                        
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

                            await context.SaveChangesAsync();
                            if (stateChanged) await _hubContext.Clients.All.SendAsync("OnModeChanged");
                        }

                        string currentMode = readerDB?.CurrentMode ?? "โหมดปกติ (Normal)";

                        string? overrideModeForBatch = null;
                        List<string> regularTagsInBatch = new List<string>();

                        foreach (var rfid in rfidTagsToProcess)
                        {
                            if (string.IsNullOrEmpty(rfid)) continue;
                            var specialTag = await context.SpecialTags.FindAsync(rfid);
                            if (specialTag != null) {
                                if (overrideModeForBatch == null) overrideModeForBatch = specialTag.CommandType; // ยึด Special Tag ตัวแรก
                            }
                            else regularTagsInBatch.Add(rfid);
                        }

                        if (overrideModeForBatch != null)
                        {
                            currentMode = overrideModeForBatch;
                            if(readerDB != null) {
                                readerDB.CurrentMode = currentMode;
                                await context.SaveChangesAsync();
                            }
                            await TriggerLed(readerName, "GREEN");
                            await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = currentMode });
                        }
                        else
                        {
                            // 💡 [แก้ไข] ปิดลอจิกดีดกลับเป็น Normal อัตโนมัติ เพื่อให้โหมดค้างสถานะ (Sticky Mode)
                            // จนกว่าผู้ใช้จะสแกนป้าย "โหมดปกติ" กลับมาเอง
                            /*
                            if (currentMode != "โหมดปกติ (Normal)" && currentMode != "Normal")
                            {
                                currentMode = "โหมดปกติ (Normal)";
                                if(readerDB != null) {
                                    readerDB.CurrentMode = "โหมดปกติ (Normal)";
                                    await context.SaveChangesAsync();
                                }
                            }
                            */
                        }

                        bool anyChangesToSave = false; 

                        foreach (var rfid in regularTagsInBatch)
                        {
                            var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                            
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
                                    await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = true });
                                }
                                else if (shouldSave) {
                                    linen.UpdatedAt = ThaiTime();
                                    anyChangesToSave = true; 
                                    await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = finalStatus, location = linen.CurrentLocation, productName = linen.Product?.ProductName, timestamp = ThaiTime(), isDuplicate = false });
                                }
                            }
                            else
                            {
                                await _hubContext.Clients.All.SendAsync("OnScan", new { rfid, reader = readerName, mode = currentMode, status = "ไม่พบในระบบ", productName = "ไม่พบในระบบ", timestamp = ThaiTime(), isDuplicate = false });
                            }
                        }

                        if (anyChangesToSave)
                        {
                            await context.SaveChangesAsync();
                        }

                        await TriggerLed(readerName, "GREEN");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Scan Process Error: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// แปลเป็นข้อความสถานะภาษาไทยรูปแบบมาตรฐานให้ส่งถึงหน้ากระดานแอปพลอเคชัน
        /// </summary>
        /// <param name="status">สถานะสากลหรือข้อมูลเริ่มต้นที่ได้</param>
        /// <returns>อักษรความเรียงภาษาท้องถิ่นสำหรับคนอ่านรู้เรื่อง</returns>
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

        /// <summary>
        /// ลงบันทึกประวัติความเคลื่อนไหวข้อมูลผ้าให้ระบบฐานข้อมูลกลางรับรู้
        /// </summary>
        /// <param name="context">ระเบียนคำสั่งฐานข้อมูลที่ทำงานอยู่</param>
        /// <param name="linenId">รหัสนามแฝงผ้าบนฐาน</param>
        /// <param name="activity">กิจกรรมชี้ขาดพฤติกรรมตัวบท</param>
        /// <param name="desc">คำบรรยายสัจจะบันทึก</param>
        /// <param name="from">ตั้งต้นที่ออกจากวงจรแรก</param>
        /// <param name="to">หมุดหมายแห่งวงจรการนำพาต่อ</param>
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

        /// <summary>
        /// กิจกรรมสอดส่องและตามติดตัวแปรออฟไลน์พร้อมวิเคราะห์ข้อมูลการทักษะพักเบรก
        /// </summary>
        /// <param name="stoppingToken">สัญญานเรียกคืนของกระแสแม่จากกรอบเซสชัน</param>
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
                                Console.WriteLine($"🔌 Reader {reader.ReaderName} is OFFLINE");
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
                                        Console.WriteLine($"🔒 Reader {reader.ReaderName} Lockdown (Outside Hours) -> FORCE SLEEP");
                                    }
                                }
                                else
                                {
                                    // ⏱️ หมดเวลา 30 วิเป๊ะๆ ไม่มีการยืดเวลาจากการสแกน -> สั่งให้หลับทันที
                                    if (!isCurrentlySleeping && secondsSinceLastActivity > 30)
                                    {
                                        if ((now - state.LastSleepCommandSent).TotalSeconds > 10) 
                                        {
                                            await SetSleepMode(reader.ReaderName, true);
                                            reader.CurrentMode = "โหมดหลับ (SLEEP)";
                                            reader.UpdatedAt = now; 
                                            needUpdate = true;
                                            Console.WriteLine($"💤 Reader {reader.ReaderName} Active Time Expired (30s) -> Auto SLEEP");
                                        }
                                    }
                                    
                                    // ❌ ลบเงื่อนไข else if ตัวปลุกอัตโนมัติออกแล้ว 
                                    // เครื่องจะไม่ผีหลอกตื่นเองอีกต่อไป
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
                catch (Exception ex) { Console.WriteLine($"⚠️ Monitor Error: {ex.Message}"); }
            }
        }

        /// <summary>
        /// ชำระล้างปิดทิ้งการประมวลผลเซสชันและทำความสะอาดหน่วยความจำ
        /// </summary>
        public override void Dispose()
        {
            _mqttClient?.Dispose();
            base.Dispose();
        }
    }

    /// <summary>
    /// โครงสร้างข้อความสำหรับการรับคำสั่ง
    /// </summary>
    public class CommandPayload { 
        public string? cmd { get; set; } 
    }

    /// <summary>
    /// รูปแบบโอนส่งรหัสแบบตัวเดี่ยว
    /// </summary>
    public class ScanPayload { 
        public string? rfid { get; set; } 
    }
    
    /// <summary>
    /// ชุดระเบียนคำสั่งส่งพวงข้อมูลเป็นจำนวนก้อน
    /// </summary>
    public class ScanBatchPayload {
        public string? reader_id { get; set; }
        public List<string>? rfid_tags { get; set; }
        public string? rfid { get; set; }
    }
    
    /// <summary>
    /// รูปแบบสัญญาณแพ็คเก็ตคลื่นหัวใจของเครื่องสแกนประมวลตัว
    /// </summary>
    public class ReaderStatusDto { 
        public string? ip { get; set; } 
        public string? status { get; set; } 
        public string? source { get; set; } 
    }
}