using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using System.Text.Json;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการเครื่องอ่าน RFID และส่งคำสั่งควบคุมทางไกล
    /// </summary>
    public class ReaderService : IReaderService
    {
        private readonly LinenDbContext _context;
        private readonly MqttPublisherService _mqttPublisher;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ReaderService(LinenDbContext context, MqttPublisherService mqttPublisher, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _mqttPublisher = mqttPublisher;
            _hubContext = hubContext;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        /// <summary>
        /// ดึงรายการเครื่องอ่านทั้งหมดในระบบ
        /// </summary>
        /// <returns>ชุดข้อมูลของเครื่องอ่านเรียงตามรหัส</returns>
        public async Task<IEnumerable<Reader>> GetReadersAsync()
        {
            return await _context.Readers
                .OrderBy(r => r.ReaderId)
                .ToListAsync();
        }

        /// <summary>
        /// เพิ่มเครื่องอ่านใหม่ลงทะเบียนเข้าสู่ระบบ
        /// </summary>
        /// <param name="reader">ข้อมูลโมเดลจำเพาะของเครื่องอ่านใหม่</param>
        /// <returns>รายละเอียดเครื่องที่ลงทะเบียนเสร็จสิ้น</returns>
        public async Task<(int Status, string? Message, Reader? Item)> AddReaderAsync(Reader reader)
        {
            // ตรวจสอบชื่อเครื่องซ้ำ
            if (await _context.Readers.AnyAsync(r => r.ReaderName == reader.ReaderName))
            {
                return (400, $"ชื่อเครื่อง '{reader.ReaderName}' มีอยู่ในระบบแล้ว", null);
            }

            reader.IsActive = false; 
            reader.CurrentMode = "โหมดปกติ (Normal)"; 
            
            if (string.IsNullOrEmpty(reader.IpAddress))
            {
                reader.IpAddress = "-";
            }

            if (string.IsNullOrEmpty(reader.ReaderFunction)) reader.ReaderFunction = "CHECK";
            reader.UpdatedAt = ThaiTime();

            _context.Readers.Add(reader);
            
            // แจ้งเตือนการเพิ่มอุปกรณ์ใหม่ให้ผู้ดูแลทราบ
            _context.Notifications.Add(new Notification 
            {
                UserId = null,  
                RoleId = 1,     
                Title = "เพิ่มอุปกรณ์ใหม่",
                Message = $"เพิ่มอุปกรณ์: {reader.ReaderName} เข้าสู่ระบบ (สถานะเริ่มต้น: ออฟไลน์)",
                Type = "INFO",  
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/readers" 
            });

            await _context.SaveChangesAsync();
            return (201, null, reader);
        }

        /// <summary>
        /// แก้ไขรายละเอียดของเครื่องอ่านอุปกรณ์ที่มีอยู่แล้ว
        /// </summary>
        /// <param name="id">รหัสอ้างอิงตัวเครื่อง</param>
        /// <param name="reader">โมเดลข้อมูลเพื่อปรับปรุงตัวเครื่อง</param>
        /// <returns>สถานะความสำเร็จจากการแก้ไขข้อมูล</returns>
        public async Task<(int Status, string? Message)> UpdateReaderAsync(int id, Reader reader)
        {
            if (id != reader.ReaderId) return (400, "ID ไม่ตรงกัน");

            reader.UpdatedAt = ThaiTime();
            _context.Entry(reader).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Readers.AnyAsync(e => e.ReaderId == id)) return (404, null);
                else throw;
            }

            return (204, null);
        }

        /// <summary>
        /// ถอนรื้อข้อมูลอุปกรณ์ตัวอ่านออกจากสารบบ
        /// </summary>
        /// <param name="id">รหัสอ้างอิงตัวอ่านที่ต้องการถอน</param>
        /// <returns>ผลการล้างข้อมูลอุปกรณ์</returns>
        public async Task<(int Status, string? Message)> DeleteReaderAsync(int id)
        {
            var reader = await _context.Readers.FindAsync(id);
            if (reader == null) return (404, null);

            // แจ้งเตือนกระบวนการลบเครื่องให้ผู้ดูแล
            _context.Notifications.Add(new Notification 
            {
                UserId = null, RoleId = 1,
                Title = "ลบอุปกรณ์",
                Message = $"ลบอุปกรณ์: {reader.ReaderName} ออกจากระบบ",
                Type = "WARNING", 
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/readers"
            });

            _context.Readers.Remove(reader);
            await _context.SaveChangesAsync();
            return (200, null);
        }

        /// <summary>
        /// ส่งคำสั่งตรงเข้าตัวอุปกรณ์เพื่อปรับตั้งค่าการทำงาน (Sleep/Wake)
        /// </summary>
        /// <param name="request">โครงสร้างชุดส่งคำสั่ง (โหมดปฏิบัติการ)</param>
        /// <returns>ความคล่องตัวเสร็จสิ้นหลังจากส่งคำสั่ง</returns>
        public async Task<(int Status, string? Message)> SendConfigAsync(ReaderConfigDto request)
        {
            var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == request.ReaderId);
            if (reader == null) return (404, "Reader not found");

            try
            {
                string exactTopic = $"reader/{request.ReaderId}/command";
                string payload = JsonSerializer.Serialize(new { cmd = request.Command.ToUpper(), val = request.Value ?? "" });
                
                await _mqttPublisher.PublishRawMessageAsync(exactTopic, payload, false);

                string title = "สั่งงานอุปกรณ์";
                string msg = $"ส่งคำสั่ง {request.Command} ไปที่ {request.ReaderId}";
                string type = "INFO";

                if (request.Command.ToUpper() == "SLEEP")
                {
                    reader.CurrentMode = "โหมดหลับ (SLEEP)";
                    reader.UpdatedAt = ThaiTime(); 
                    msg = $"💤 สั่งเข้าโหมดหลับ: {request.ReaderId}";
                    type = "WARNING"; 
                }
                else if (request.Command.ToUpper() == "WAKE")
                {
                    reader.CurrentMode = "โหมดปกติ (Normal)";
                    reader.UpdatedAt = ThaiTime(); 
                    msg = $"☀️ สั่งปลุกเครื่อง: {request.ReaderId}";
                    type = "SUCCESS"; 
                }

                _context.Notifications.Add(new Notification 
                {
                    UserId = null, RoleId = 1,
                    Title = title,
                    Message = msg,
                    Type = type,
                    IsRead = false,
                    CreatedAt = ThaiTime(),
                    LinkUrl = "/readers"
                });

                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("OnModeChanged");

                return (200, "Success");
            }
            catch (Exception ex)
            {
                return (500, "MQTT Error: " + ex.Message);
            }
        }

        /// <summary>
        /// ปลุกเครื่องทำงานทางอ้อมผ่านการเรียกคำสั่ง API โดดๆ
        /// </summary>
        /// <param name="readerName">ชื่ออ้างเรียกเครื่องเป้าหมาย</param>
        /// <returns>ความก้าวหน้าการปลุกให้ตื่น</returns>
        public async Task<(int Status, string? Message)> WakeReaderAsync(string readerName)
        {
            Console.WriteLine($"🔔 Waking up reader: {readerName} (via direct API)");
            
            try 
            {
                var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                if (reader == null) return (404, "Reader not found");

                string exactTopic = $"reader/{readerName}/command";
                string payload = JsonSerializer.Serialize(new { cmd = "WAKE", val = "" });

                await _mqttPublisher.PublishRawMessageAsync(exactTopic, payload, false);

                reader.CurrentMode = "โหมดปกติ (Normal)"; 
                reader.UpdatedAt = ThaiTime(); 
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("OnModeChanged");

                return (200, $"Sent WAKE command to {readerName} and reset timer.");
            }
            catch (Exception ex)
            {
                return (500, "Error waking reader: " + ex.Message);
            }
        }
    }
}
