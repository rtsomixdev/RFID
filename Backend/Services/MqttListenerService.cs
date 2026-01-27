using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Extensions.ManagedClient;
using System.Text;
using System.Text.Json;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class MqttListenerService : BackgroundService
    {
        private IManagedMqttClient? _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;

        public MqttListenerService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var mqttFactory = new MqttFactory();
            var mqttClientOptions = new MqttClientOptionsBuilder()
                .WithClientId("Backend_Service_" + Guid.NewGuid().ToString())
                .WithTcpServer("localhost", 1883)
                .Build();

            var managedMqttClientOptions = new ManagedMqttClientOptionsBuilder()
                .WithClientOptions(mqttClientOptions)
                .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
                .Build();

            _mqttClient = mqttFactory.CreateManagedMqttClient();

            _mqttClient.ConnectedAsync += async e =>
            {
                Console.WriteLine("✅ [MQTT] Connected and Ready!");
                if (_mqttClient != null) {
                    await _mqttClient.SubscribeAsync("linen/scan/+"); 
                    await _mqttClient.SubscribeAsync("linen/status/+"); 
                }
            };

            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payloadStr = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

                // -----------------------------------------------------------
                // 🟢 CASE A: รับสถานะ (Heartbeat)
                // -----------------------------------------------------------
                if (topic.StartsWith("linen/status/"))
                {
                    try 
                    {
                        var statusData = JsonSerializer.Deserialize<ReaderStatusDto>(payloadStr);
                        var readerName = topic.Split('/').Last(); 

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
                                    reader.ReaderType = statusData.version ?? reader.ReaderType;
                                    reader.IsActive = true; 
                                }

                                // 🔔 แจ้งเตือน Notification
                                if (wasOffline)
                                {
                                    var noti = new Notification 
                                    {
                                        UserId = null, RoleId = 1,
                                        Title = "อุปกรณ์กลับมาออนไลน์",
                                        Message = $"✅ {readerName} เชื่อมต่อแล้ว (IP: {statusData?.ip})", // ✅ แก้เป็น Message
                                        Type = "SUCCESS", 
                                        IsRead = false,
                                        CreatedAt = ThaiTime(),
                                        LinkUrl = "/rfid-connect"
                                    };
                                    dbContext.Notifications.Add(noti);
                                }

                                await dbContext.SaveChangesAsync();
                                Console.WriteLine($"   --> [Status Update] {readerName} is ONLINE");
                            }
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"❌ Status Error: {ex.Message}"); }
                    return;
                }

                // -----------------------------------------------------------
                // 🔵 CASE B: สแกน RFID
                // -----------------------------------------------------------
                try 
                {
                    var data = JsonSerializer.Deserialize<ScanPayload>(payloadStr);

                    if (data != null && !string.IsNullOrEmpty(data.rfid))
                    {
                        using (var scope = _scopeFactory.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<LinenDbContext>();
                            var now = ThaiTime();

                            // 🔒 STEP 1: Security Check
                            var registeredReader = await dbContext.Readers
                                .FirstOrDefaultAsync(r => r.ReaderName == data.reader_id && r.IsActive == true);

                            if (registeredReader == null) {
                                Console.WriteLine($"⛔ [Security Block] Rejected unknown reader: {data.reader_id}");
                                return; 
                            }

                            if (data.rfid == "MASTER_RESET_CARD") {
                                Console.WriteLine($"⚡ [Command] Master Card detected.");
                                return; 
                            }
                            
                            // ✅ STEP 2: Logic ปกติ
                            var linen = await dbContext.Linens.Include(l => l.Product).FirstOrDefaultAsync(l => l.RfidCode == data.rfid); 

                            if (linen != null)
                            {
                                linen.CurrentLocation = data.reader_id ?? "Unknown Reader";
                                linen.UpdatedAt = now;
                                
                                // กรณีนี้ใช้ SystemLog เหมือนเดิม หรือจะเปลี่ยนเป็น Notification ก็ได้
                                // แต่ SystemLog เหมาะกว่าสำหรับ Transaction เยอะๆ
                                var log = new SystemLog 
                                {
                                    UserId = 1, ActionType = "SCAN_MOVE",
                                    Description = $"ย้าย {linen.RfidCode} ไปที่ {linen.CurrentLocation}",
                                    CreatedAt = now
                                };
                                dbContext.SystemLogs.Add(log);

                                await dbContext.SaveChangesAsync();
                                Console.WriteLine($"   --> [Updated] {linen.RfidCode} moved to {linen.CurrentLocation}");
                            }
                            else
                            {
                                // ❌ แจ้งเตือนของแปลกปลอม (เข้า Notification เลยเพราะสำคัญ)
                                var noti = new Notification 
                                {
                                    UserId = null, RoleId = 1,
                                    Title = "พบ RFID แปลกปลอม",
                                    Message = $"⚠️ พบ Tag ไม่รู้จัก: {data.rfid} ที่ {data.reader_id}", // ✅ แก้เป็น Message
                                    Type = "WARNING",
                                    IsRead = false,
                                    CreatedAt = now,
                                    LinkUrl = "/linen-stock"
                                };
                                dbContext.Notifications.Add(noti);
                                await dbContext.SaveChangesAsync();
                                Console.WriteLine($"   --> [Unknown Tag] {data.rfid} notified.");
                            }
                        }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"❌ MQTT Error: {ex.Message}"); }
            };

            await _mqttClient.StartAsync(managedMqttClientOptions);

            while (!stoppingToken.IsCancellationRequested) { await Task.Delay(1000, stoppingToken); }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_mqttClient != null) await _mqttClient.StopAsync();
            await base.StopAsync(cancellationToken);
        }
    }

    public class ScanPayload { public string? rfid { get; set; } public string? reader_id { get; set; } }
    public class ReaderStatusDto { public string? ip { get; set; } public string? version { get; set; } public string? status { get; set; } }
}