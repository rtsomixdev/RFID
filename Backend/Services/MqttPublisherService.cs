using MQTTnet;
using MQTTnet.Client;
using System.Text.Json; // ✅ เพิ่มบรรทัดนี้เพื่อใช้สร้าง JSON
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
                .WithClientId("Backend_Publisher_" + System.Guid.NewGuid().ToString()) // ✅ เติม GUID กัน ID ชนกัน
                .WithCleanSession()
                .Build();
        }

        // ✅ ฟังก์ชันพื้นฐาน (Core Publish)
        public async Task PublishAsync(string topic, string payload)
        {
            try 
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
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ Publish Error: {ex.Message}");
            }
        }

        // =========================================================================
        // 🔥🔥🔥 เพิ่มส่วนนี้ครับ (Enterprise Logic) 🔥🔥🔥
        // ฟังก์ชันนี้จำเป็นสำหรับ MqttListenerService เพื่อสั่งไฟ LED กลับไปที่บอร์ด
        // =========================================================================
        public async Task PublishCommandAsync(string readerId, string command, string color, bool beep = false)
        {
            // 1. สร้าง Object ข้อมูลที่จะส่ง
            var payloadObj = new
            {
                cmd = command,  // เช่น "LED"
                val = color,    // เช่น "RED", "GREEN", "YELLOW", "OFF"
                beep = beep     // true = สั่งให้บอร์ดส่งเสียง Beep
            };

            // 2. แปลงเป็น JSON String
            var jsonPayload = JsonSerializer.Serialize(payloadObj);
            
            // 3. กำหนด Topic ปลายทาง (เช่น reader/R01/command)
            var topic = $"reader/{readerId}/command";

            // 4. ส่งข้อมูลออกไป
            await PublishAsync(topic, jsonPayload);
            
            // 5. Log ไว้ตรวจสอบ
            System.Console.WriteLine($"📤 [MQTT Command] Sent to {readerId}: {jsonPayload}");
        }
    }
}