using MQTTnet;
using MQTTnet.Client;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace Backend.Services
{
    /// <summary>
    /// บริการส่งข้อมูลควบคุมและรักษาสถานะเบื้องหลังสำหรับโพรโทคอล MQTT
    /// </summary>
    public class MqttPublisherService : IDisposable
    {
        private readonly IMqttClient _mqttClient;
        private readonly MqttClientOptions _options;
        private readonly SemaphoreSlim _connectionLock = new SemaphoreSlim(1, 1);

        public MqttPublisherService(IConfiguration configuration)
        {
            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();

            // ดึงค่าการตั้งค่าโฮสต์จากระบบ หรือใช้เครือข่ายจำลองแทน
            string mqttHost = configuration["MqttConfig:Server"] ?? "mosquitto";
            int mqttPort = int.TryParse(configuration["MqttConfig:Port"], out int port) ? port : 1883;

            // กำหนดคอนฟิกูเรชันสำหรับการเชื่อมต่อตัวรับส่งสัญญาน
            _options = new MqttClientOptionsBuilder()
                .WithTcpServer(mqttHost, mqttPort)
                .WithClientId("Backend_Publisher_" + Guid.NewGuid().ToString())
                .WithCleanSession()
                .Build();
        }

        /// <summary>
        /// ส่งข้อความทั่วไปโดยไม่ได้ตั้งให้คงค้างไว้บนโบรคเกอร์
        /// </summary>
        /// <param name="topic">หัวข้อรับส่ง</param>
        /// <param name="payload">เนื้อความสื่อสาร</param>
        public async Task PublishAsync(string topic, string payload)
        {
            await PublishRawMessageAsync(topic, payload, false);
        }

        /// <summary>
        /// ส่งคำสั่งตรงเข้าอุปกรณ์ผ่าน MQTT พร้อมทางเลือกว่าจะคงข้อมูลไว้หรือไม่
        /// </summary>
        /// <param name="exactTopic">ปลายทางข้อความ</param>
        /// <param name="payload">เนื้อความคำสั่ง</param>
        /// <param name="retain">คำขออนุญาตฝากข้อความค้างไว้</param>
        public async Task PublishRawMessageAsync(string exactTopic, string payload, bool retain)
        {
            try 
            {
                // ประวิงเวลาเพื่อไม่ให้ต่อเชื่อมโครงข่ายแทรกซ้อนจนเกิดสภาวะแข่งขัน
                if (!_mqttClient.IsConnected)
                {
                    await _connectionLock.WaitAsync();
                    try
                    {
                        if (!_mqttClient.IsConnected)
                        {
                            await _mqttClient.ConnectAsync(_options);
                        }
                    }
                    finally
                    {
                        _connectionLock.Release();
                    }
                }

                // จัดรูปร่างข้อความคำสั่งตามมาตรฐาน MQTT รุ่นระบุไว้
                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(exactTopic)
                    .WithPayload(payload)
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                    .WithRetainFlag(retain)
                    .Build();

                await _mqttClient.PublishAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Publish Error: {ex.Message}");
            }
        }

        /// <summary>
        /// ส่งคำสั่งตอบสนองทางกายภาพและแจ้งไฟสถานะสู่อุปกรณ์
        /// </summary>
        /// <param name="readerId">ไอดีประจำเครื่องอ่าน</param>
        /// <param name="command">คำสั่งหรือรูปแบบการตอบโต้</param>
        /// <param name="color">สีของไฟแสดงสถานะการทำงาน</param>
        /// <param name="beep">ระบบเสียงสำหรับการรับรู้</param>
        public async Task PublishCommandAsync(string readerId, string command, string color, bool beep = false)
        {
            // ประกอบโฉมคลาสอ็อบเจกต์คำสั่งเตรียมตัวส่ง
            var payloadObj = new
            {
                cmd = command,
                val = color,
                beep = beep
            };

            var jsonPayload = JsonSerializer.Serialize(payloadObj);
            
            var topic = $"reader/{readerId}/command";

            await PublishAsync(topic, jsonPayload);
            
            Console.WriteLine($"📤 [MQTT Command] Sent to {readerId}: {jsonPayload}");
        }

        /// <summary>
        /// ทำลายอ็อบเจกต์การทำงานทิ้งเมื่อไม่ได้ประยุกต์ใช้งานหรือหยุดการทำงานเบื้องหลัง
        /// </summary>
        public void Dispose()
        {
            if (_mqttClient != null)
            {
                if (_mqttClient.IsConnected)
                {
                    _mqttClient.DisconnectAsync().GetAwaiter().GetResult();
                }
                _mqttClient.Dispose();
            }
            _connectionLock?.Dispose();
        }
    }
}