using MQTTnet;
using MQTTnet.Client;
using System.Threading.Tasks;

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

            // ตั้งค่าการเชื่อมต่อ MQTT Broker (Mosquitto)
            _options = new MqttClientOptionsBuilder()
                .WithTcpServer("localhost", 1883) // ถ้าใช้ Docker หรือเครื่องอื่น ให้แก้ localhost เป็น IP นั้น
                .WithClientId("Backend_Publisher")
                .Build();
        }

        // ✅ ฟังก์ชันนี้แหละครับที่ขาดไป ทำให้เกิด Error CS1061
        public async Task PublishAsync(string topic, string payload)
        {
            // ถ้ายังไม่ต่อเน็ต ให้ต่อก่อนส่ง
            if (!_mqttClient.IsConnected)
            {
                await _mqttClient.ConnectAsync(_options);
            }

            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(payload)
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _mqttClient.PublishAsync(message);
        }
    }
}