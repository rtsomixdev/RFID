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
    // Class เก็บสถานะชั่วคราวของ Reader (In-Memory State)
    public class ReaderRuntimeState
    {
        public string CurrentMode { get; set; } = "Normal"; 
        public DateTime? ScanningUntil { get; set; } 
        public bool IsScanningActive => ScanningUntil.HasValue && DateTime.UtcNow.AddHours(7) <= ScanningUntil.Value;
    }

    public class MqttListenerService : BackgroundService
    {
        private IManagedMqttClient? _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly MqttPublisherService _mqttPublisher; 

        // เก็บสถานะ Reader ไว้ใน RAM เพื่อความเร็วในการเช็คโหมด
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
                    // Subscribe Topics
                    await _mqttClient.SubscribeAsync("reader/+/scan");
                    await _mqttClient.SubscribeAsync("reader/+/status");
                }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                await ProcessMessage(e);
            };

            await _mqttClient.StartAsync(managedMqttClientOptions);
            
            // เริ่ม Background Task คอยเช็คว่าใคร Offline ไปแล้วบ้าง
            _ = MonitorOfflineNodes(stoppingToken);

            while (!stoppingToken.IsCancellationRequested) await Task.Delay(1000, stoppingToken);
        }

        private async Task ProcessMessage(MqttApplicationMessageReceivedEventArgs e)
        {
            var topic = e.ApplicationMessage.Topic;
            var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

            // แยก Reader Name จาก Topic (reader/{name}/status)
            var parts = topic.Split('/');
            string readerName = (parts.Length >= 2) ? parts[1] : "Unknown";

            // -----------------------------------------------------------
            // 🟢 CASE A: รับ Status Heartbeat (แก้ไขให้ครบสมบูรณ์แล้ว)
            // -----------------------------------------------------------
            if (topic.EndsWith("/status"))
            {
                try 
                {
                    // แปลง JSON: {"ip": "192.168.1.10", "status": "online"}
                    var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr, _jsonOptions);

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);

                        // ถ้าไม่เจอ Reader ชื่อนี้ใน DB ให้ข้ามไป (หรือจะ Auto-create ก็ได้)
                        if (reader != null)
                        {
                            reader.IsActive = true; // ตั้งเป็น Online
                            reader.UpdatedAt = ThaiTime(); // อัปเดตเวลาล่าสุด
                            
                            if (statusData?.ip != null) 
                            {
                                reader.IpAddress = statusData.ip;
                            }

                            await context.SaveChangesAsync();
                            Console.WriteLine($"💓 [Heartbeat] {readerName} is Online (IP: {reader.IpAddress})");
                        }
                    }
                }
                catch (Exception ex) 
                {
                    Console.WriteLine($"❌ Status Payload Error: {ex.Message}");
                }
                return;
            }

            // -----------------------------------------------------------
            // 🔵 CASE B: รับค่า Scan RFID
            // -----------------------------------------------------------
            if (topic.EndsWith("/scan"))
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                    
                    // แปลง Payload
                    string rfid = payloadStr;
                    if (payloadStr.Trim().StartsWith("{"))
                    {
                        var data = JsonSerializer.Deserialize<ScanPayload>(payloadStr, _jsonOptions);
                        rfid = data?.rfid ?? "";
                    }
                    if (string.IsNullOrEmpty(rfid)) return;

                    // อัปเดต State ใน RAM
                    if (!_readerStates.ContainsKey(readerName))
                    {
                        _readerStates[readerName] = new ReaderRuntimeState();
                    }
                    var state = _readerStates[readerName];

                    // 🔥🔥🔥 ส่ง SignalR บอกหน้าเว็บทันที ไม่ว่า Tag อะไร 🔥🔥🔥
                    // เพื่อให้หน้า "ลงทะเบียน Special Tag" รับค่าได้
                    await _hubContext.Clients.All.SendAsync("OnScan", new { 
                        rfid = rfid, 
                        reader = readerName,
                        mode = state.CurrentMode 
                    });

                    // 1. เช็คว่าเป็น Special Tag (บัตรคำสั่ง) หรือไม่?
                    var specialTag = await context.SpecialTags.FindAsync(rfid);
                    if (specialTag != null)
                    {
                        // เปลี่ยนโหมดของเครื่องอ่านนี้
                        state.CurrentMode = specialTag.CommandType;
                        state.ScanningUntil = ThaiTime().AddSeconds(30); // ให้เวลา 30 วิ
                        
                        // อัปเดตลง DB ด้วยเพื่อให้หน้าเว็บเห็น
                        var readerDB = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                        if(readerDB != null) {
                            readerDB.CurrentMode = state.CurrentMode;
                            await context.SaveChangesAsync();
                        }

                        Console.WriteLine($"🎛 [Mode Change] {readerName} -> {state.CurrentMode}");
                        
                        // ส่งคำสั่งกลับไปหาบอร์ด: ไฟเหลือง + เสียง Beep
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "YELLOW", true);
                        
                        // แจ้งหน้าเว็บ
                        await _hubContext.Clients.All.SendAsync("OnModeChanged", new { reader = readerName, mode = state.CurrentMode });
                        return;
                    }

                    // 2. เช็คเวลา (Timed Scanning)
                    if (state.CurrentMode != "Normal" && !state.IsScanningActive)
                    {
                        Console.WriteLine($"⛔ [Timeout] {readerName} scan expired.");
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "RED", true);
                        
                        // หมดเวลาแล้ว ให้กลับเป็น Normal อัตโนมัติ (Optional)
                        state.CurrentMode = "Normal";
                        return; 
                    }

                    // 3. ประมวลผลผ้า (Linen Logic)
                    var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);
                    if (linen != null)
                    {
                        bool isDuplicate = false;
                        string prevLoc = linen.CurrentLocation ?? "Unknown";

                        switch (state.CurrentMode)
                        {
                            case "MODE_WASH":
                                if (linen.Status == "Washing") isDuplicate = true;
                                else {
                                    linen.Status = "Washing";
                                    linen.CurrentLocation = "Laundry";
                                    linen.WashCount++;
                                    LogMovement(context, linen.LinenId, "Wash", "ส่งซัก (Auto)", prevLoc, "Laundry");
                                }
                                break;

                            case "MODE_DISCARD":
                                if (linen.IsActive == false) isDuplicate = true;
                                else {
                                    linen.Status = "Discarded";
                                    linen.IsActive = false;
                                    linen.CurrentLocation = "Disposal";
                                    LogMovement(context, linen.LinenId, "Discard", "จำหน่ายออก (Auto)", prevLoc, "Disposal");
                                }
                                break;

                            case "MODE_RESTOCK":
                                if (linen.Status == "Available" && linen.CurrentLocation == "Stock") isDuplicate = true;
                                else {
                                    linen.Status = "Available";
                                    linen.CurrentLocation = "Stock";
                                    LogMovement(context, linen.LinenId, "Restock", "รับเข้าคลัง (Auto)", prevLoc, "Stock");
                                }
                                break;
                                
                            default: // Normal Mode
                                // แค่อัปเดตตำแหน่งเฉยๆ
                                if (linen.CurrentLocation == readerName) isDuplicate = true;
                                linen.CurrentLocation = readerName;
                                break;
                        }

                        if (isDuplicate)
                        {
                            Console.WriteLine($"🔁 [Duplicate] {rfid}");
                            await _mqttPublisher.PublishCommandAsync(readerName, "LED", "YELLOW", false); 
                        }
                        else
                        {
                            linen.UpdatedAt = ThaiTime();
                            await context.SaveChangesAsync();
                            Console.WriteLine($"✅ [Success] {rfid} processed");
                            
                            await _mqttPublisher.PublishCommandAsync(readerName, "LED", "GREEN", true);
                        }
                    }
                    else
                    {
                        Console.WriteLine($"❓ [Unknown] {rfid}");
                        await _mqttPublisher.PublishCommandAsync(readerName, "LED", "RED", true);
                    }
                }
            }
        }

        // 🔥 Monitor Loop: เช็คว่าใครเงียบไปนานเกิน 2 นาที ให้ปรับเป็น Offline
        private async Task MonitorOfflineNodes(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // เช็คทุก 30 วิ

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                        var threshold = ThaiTime().AddMinutes(-2); // เกณฑ์เวลาคือ 2 นาที

                        var offlineReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < threshold)
                            .ToListAsync(stoppingToken);

                        if (offlineReaders.Any())
                        {
                            foreach (var reader in offlineReaders)
                            {
                                reader.IsActive = false; // ปรับเป็น Offline
                                Console.WriteLine($"❌ [Monitor] {reader.ReaderName} timed out (Offline)");
                            }
                            await context.SaveChangesAsync(stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Monitor Error: {ex.Message}");
                }
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
    
    // DTO รับค่า JSON จาก ESP32 Payload
    public class ReaderStatusDto { 
        public string? ip { get; set; } 
        public string? status { get; set; } 
    }
}