using MQTTnet;
using MQTTnet.Client;
using System.Text;
using System.Text.Json;

namespace Backend.Services
{
    public class MqttPublisherService
    {
        private readonly IMqttClient _mqttClient;
        private readonly MqttClientOptions _options;

        public MqttPublisherService()
        {
            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();
            
            _options = new MqttClientOptionsBuilder()
                .WithClientId("Backend_Publisher_" + Guid.NewGuid().ToString())
                .WithTcpServer("localhost", 1883)
                .Build();
        }

        public async Task PublishCommandAsync(string readerId, string command, object parameters)
        {
            if (!_mqttClient.IsConnected)
            {
                await _mqttClient.ConnectAsync(_options);
            }

            // สร้าง Payload คำสั่ง
            var payloadObj = new 
            {
                cmd = command,
                val = parameters,
                timestamp = DateTime.Now
            };
            var payloadStr = JsonSerializer.Serialize(payloadObj);

            // ✅ FIX: แก้ไขชื่อ Topic ให้ปลอดภัย (Sanitize Topic)
            // เปลี่ยนตัวอักษรต้องห้าม (#, +) ให้เป็น Underscore (_)
            // เช่น "Handheld #01" -> "Handheld_01"
            var safeReaderId = readerId
                                .Replace("#", "_")
                                .Replace("+", "_");

            // ส่งไปที่ Topic เฉพาะของเครื่องนั้นๆ
            // เช่น: linen/config/Gate1
            var topic = $"linen/config/{safeReaderId}";

            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payloadStr)
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _mqttClient.PublishAsync(message);
            Console.WriteLine($"📤 Sent Command to {topic}: {payloadStr}");
        }
    }
}