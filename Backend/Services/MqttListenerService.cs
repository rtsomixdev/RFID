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
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Services
{
    public class MqttListenerService : BackgroundService
    {
        private IManagedMqttClient? _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hubContext;

        // ตัวเลือก JSON ให้รองรับตัวพิมพ์เล็ก/ใหญ่
        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        public MqttListenerService(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hubContext)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var mqttFactory = new MqttFactory();
            var mqttClientOptions = new MqttClientOptionsBuilder()
                .WithClientId("Backend_Service_" + Guid.NewGuid().ToString())
                .WithTcpServer("localhost", 1883) // ตรวจสอบ Host/Port ให้ตรงกับ Broker ของคุณ
                .WithCleanSession()
                .Build();

            var managedMqttClientOptions = new ManagedMqttClientOptionsBuilder()
                .WithClientOptions(mqttClientOptions)
                .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
                .Build();

            _mqttClient = mqttFactory.CreateManagedMqttClient();

            _mqttClient.ConnectedAsync += async e =>
            {
                Console.WriteLine("✅ [MQTT] Connected and Ready!");
                if (_mqttClient != null)
                {
                    await _mqttClient.SubscribeAsync("reader/+/scan");
                    await _mqttClient.SubscribeAsync("reader/+/status");
                    await _mqttClient.SubscribeAsync("linen/scan/+");
                    await _mqttClient.SubscribeAsync("linen/status/+");
                }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

                // -----------------------------------------------------------
                // 🟢 CASE A: Status (Heartbeat) -> Update Online/IP
                // -----------------------------------------------------------
                if (topic.EndsWith("/status"))
                {
                    try
                    {
                        var parts = topic.Split('/');
                        string readerName = "";

                        if (parts.Length >= 3 && parts[0] == "reader") readerName = parts[1];
                        else if (parts.Length >= 3 && parts[0] == "linen") readerName = parts[2];

                        if (string.IsNullOrEmpty(readerName)) return;

                        var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr, _jsonOptions);

                        using (var scope = _scopeFactory.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                            var reader = await dbContext.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);

                            if (reader != null)
                            {
                                bool wasOffline = reader.IsActive != true;

                                if (statusData != null)
                                {
                                    reader.IpAddress = statusData.ip ?? reader.IpAddress;
                                }

                                reader.IsActive = true;
                                reader.UpdatedAt = ThaiTime(); // Update timestamp

                                if (wasOffline)
                                {
                                    Console.WriteLine($"✅ [Online] {readerName} connected via IP: {reader.IpAddress}");
                                }

                                await dbContext.SaveChangesAsync();
                            }
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"❌ Status Error: {ex.Message}"); }
                    return;
                }

                // -----------------------------------------------------------
                // 🔵 CASE B: RFID Scan (Processing Logic)
                // -----------------------------------------------------------
                if (topic.EndsWith("/scan"))
                {
                    try
                    {
                        string readerIdStr = "Unknown";
                        var parts = topic.Split('/');
                        if (parts.Length >= 3 && parts[0] == "reader") readerIdStr = parts[1];
                        else if (parts.Length >= 3 && parts[0] == "linen") readerIdStr = parts[2];

                        string rfid = payloadStr;
                        // รองรับทั้งแบบส่งมาแค่ RFID หรือส่งมาเป็น JSON
                        if (payloadStr.Trim().StartsWith("{"))
                        {
                            var data = JsonSerializer.Deserialize<ScanPayload>(payloadStr, _jsonOptions);
                            rfid = data?.rfid ?? "";
                            if (!string.IsNullOrEmpty(data?.reader_id)) readerIdStr = data.reader_id;
                        }

                        if (string.IsNullOrEmpty(rfid)) return;

                        using (var scope = _scopeFactory.CreateScope())
                        {
                            var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                            var reader = await context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerIdStr);

                            if (reader == null && int.TryParse(readerIdStr, out int rid))
                                reader = await context.Readers.FindAsync(rid);

                            if (reader == null)
                            {
                                Console.WriteLine($"⛔ Unknown Reader: {readerIdStr}");
                                return;
                            }

                            // ✅ Update Status on Scan
                            reader.IsActive = true;
                            reader.UpdatedAt = ThaiTime();

                            // 🔥🔥🔥 SEND SIGNALR TO FRONTEND IMMEDIATELY! 🔥🔥🔥
                            // Frontend ต้อง listen event ชื่อ "OnScan"
                            await _hubContext.Clients.All.SendAsync("OnScan", new
                            {
                                rfid = rfid,
                                reader = reader.ReaderName,
                                mode = reader.CurrentMode,
                                timestamp = ThaiTime()
                            });
                            // --------------------------------------------------

                            // 1. Check Special Tag (Tags ที่ใช้เปลี่ยนโหมด)
                            var specialTag = await context.SpecialTags.FindAsync(rfid);
                            if (specialTag != null)
                            {
                                reader.CurrentMode = specialTag.CommandType;
                                await context.SaveChangesAsync();
                                Console.WriteLine($"🔄 Reader {reader.ReaderName} Mode Changed -> {reader.CurrentMode}");
                                return;
                            }

                            // 2. Process Linen Logic
                            var linen = await context.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == rfid);

                            if (linen != null)
                            {
                                string prevLocation = linen.CurrentLocation ?? "Unknown";
                                string activity = "Check";
                                string statusAfter = linen.Status ?? "Available";

                                if (string.IsNullOrEmpty(reader.CurrentMode)) reader.CurrentMode = "Normal";

                                switch (reader.CurrentMode)
                                {
                                    case "SET_MODE_WASH":
                                        if (linen.Status != "InTransit")
                                        {
                                            linen.Status = "Washing";
                                            linen.CurrentLocation = "Laundry";
                                            linen.WashCount += 1;
                                            activity = "Wash";
                                            statusAfter = "Washing";
                                            LogMovement(context, linen.LinenId, activity, "ส่งผ้าเข้าซัก", prevLocation, "Laundry", statusAfter);
                                        }
                                        break;

                                    case "SET_MODE_DISCARD":
                                    case "SET_STATUS_DAMAGED":
                                        linen.Status = "Damaged";
                                        linen.IsActive = false;
                                        activity = "Discard";
                                        statusAfter = "Damaged";
                                        LogMovement(context, linen.LinenId, activity, "แจ้งชำรุด", prevLocation, "Disposal", statusAfter);
                                        break;

                                    case "SET_MODE_RESTOCK":
                                    case "SET_STATUS_AVAILABLE":
                                        linen.Status = "Available";
                                        linen.CurrentLocation = "Stock";
                                        activity = "Restock";
                                        statusAfter = "Available";
                                        LogMovement(context, linen.LinenId, activity, "รับผ้าเข้าคลัง", prevLocation, "Stock", statusAfter);
                                        break;

                                    default:
                                        if (linen.CurrentLocation != reader.Location)
                                        {
                                            string newLoc = reader.Location ?? reader.ReaderName ?? "Unknown";
                                            linen.CurrentLocation = newLoc;
                                            activity = "Move";
                                            LogMovement(context, linen.LinenId, activity, "ย้ายตำแหน่ง", prevLocation, newLoc, statusAfter);
                                        }
                                        break;
                                }

                                linen.UpdatedAt = ThaiTime();
                                await context.SaveChangesAsync();
                                Console.WriteLine($"✅ [Linen] {rfid} processed. Mode: {reader.CurrentMode}");
                            }
                            else
                            {
                                // Unknown Tag Handling
                                var noti = new Notification
                                {
                                    UserId = null,
                                    RoleId = 1,
                                    Title = "พบ RFID แปลกปลอม",
                                    Message = $"⚠️ พบ Tag ไม่รู้จัก: {rfid} ที่ {reader.ReaderName}",
                                    Type = "WARNING",
                                    IsRead = false,
                                    CreatedAt = ThaiTime(),
                                    LinkUrl = "/linen-stock"
                                };
                                context.Notifications.Add(noti);
                                await context.SaveChangesAsync();
                                Console.WriteLine($"⚠️ [Unknown] {rfid} detected.");
                            }
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"❌ MQTT Scan Error: {ex.Message}"); }
                }
            };

            await _mqttClient.StartAsync(managedMqttClientOptions);

            // ✅ Start Offline Monitor Task (Run in background)
            _ = MonitorOfflineNodes(stoppingToken);

            // Keep the service alive
            while (!stoppingToken.IsCancellationRequested) { await Task.Delay(1000, stoppingToken); }
        }

        // 🔥 Offline Monitor Loop
        private async Task MonitorOfflineNodes(CancellationToken stoppingToken)
        {
            Console.WriteLine("🕵️‍♂️ [Monitor] Started Offline Check Loop...");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Check every 30s

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<LinenDbContext>();

                        // Threshold: If silent for more than 2 minutes
                        var threshold = ThaiTime().AddMinutes(-2);

                        // Find active readers that haven't updated recently
                        var offlineReaders = await context.Readers
                            .Where(r => r.IsActive == true && r.UpdatedAt < threshold)
                            .ToListAsync(stoppingToken);

                        if (offlineReaders.Any())
                        {
                            foreach (var reader in offlineReaders)
                            {
                                reader.IsActive = false; // Mark as Offline

                                var noti = new Notification
                                {
                                    UserId = null,
                                    RoleId = 1,
                                    Title = "อุปกรณ์ขาดการเชื่อมต่อ",
                                    Message = $"⚠️ {reader.ReaderName} ขาดการติดต่อไป (Offline Detected)",
                                    Type = "DANGER",
                                    IsRead = false,
                                    CreatedAt = ThaiTime(),
                                    LinkUrl = "/rfid-connect"
                                };
                                context.Notifications.Add(noti);
                                Console.WriteLine($"❌ [Monitor] {reader.ReaderName} marked as OFFLINE (Timeout)");
                            }
                            await context.SaveChangesAsync(stoppingToken);
                            
                            // Optional: Send SignalR update about device status
                            await _hubContext.Clients.All.SendAsync("OnDeviceOffline", offlineReaders.Select(r => r.ReaderName));
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Offline Monitor Error: {ex.Message}");
                }
            }
        }

        private void LogMovement(LinenDbContext context, int linenId, string activity, string desc, string from, string to, string statusAfter)
        {
            context.LinenLogs.Add(new LinenLog
            {
                LinenId = linenId,
                ActivityType = activity,
                Description = desc,
                FromLocation = from,
                ToLocation = to,
                // StatusAfter = statusAfter, // Uncomment if your DB has this field
                CreatedAt = ThaiTime()
            });
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_mqttClient != null) await _mqttClient.StopAsync();
            await base.StopAsync(cancellationToken);
        }
    }

    public class ScanPayload
    {
        public string? rfid { get; set; }
        public string? reader_id { get; set; }
    }

    public class ReaderStatusDto
    {
        public string? ip { get; set; }
        public string? version { get; set; }
        public string? status { get; set; }
    }
}