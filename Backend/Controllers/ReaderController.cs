using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReaderController : ControllerBase
    {
        private readonly LinenDbContext _context;
        private readonly MqttPublisherService _mqttPublisher;

        public ReaderController(LinenDbContext context, MqttPublisherService mqttPublisher)
        {
            _context = context;
            _mqttPublisher = mqttPublisher;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        // GET: api/Reader
        [HttpGet]
        public async Task<IActionResult> GetReaders()
        {
            var readers = await _context.Readers
                .OrderBy(r => r.ReaderName)
                .Select(r => new 
                {
                    r.ReaderId,
                    r.ReaderName,
                    Location = r.Location ?? "-",
                    IpAddress = r.IpAddress, 
                    Status = r.IsActive == true ? "Online" : "Offline"
                })
                .ToListAsync();
            return Ok(readers);
        }

        // POST: api/Reader
        [HttpPost]
        public async Task<IActionResult> AddReader([FromBody] Reader reader)
        {
            _context.Readers.Add(reader);
            
            // 🔔 แจ้งเตือนเข้า Notification (Admin)
            _context.Notifications.Add(new Notification 
            {
                UserId = null,  
                RoleId = 1,     // Admin
                Title = "เพิ่มอุปกรณ์ใหม่",
                Message = $"เพิ่มอุปกรณ์: {reader.ReaderName} เข้าสู่ระบบ", // ✅ แก้เป็น Message
                Type = "INFO",  
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/rfid-connect" // ✅ ใส่ Link ให้ด้วยเลย
            });

            await _context.SaveChangesAsync();
            return Ok(reader);
        }

        // DELETE: api/Reader/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReader(int id)
        {
            var reader = await _context.Readers.FindAsync(id);
            if (reader == null) return NotFound();

            // 🔔 แจ้งเตือนลบ
            _context.Notifications.Add(new Notification 
            {
                UserId = null, RoleId = 1,
                Title = "ลบอุปกรณ์",
                Message = $"ลบอุปกรณ์: {reader.ReaderName} ออกจากระบบ", // ✅ แก้เป็น Message
                Type = "WARNING", 
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/rfid-connect"
            });

            _context.Readers.Remove(reader);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: api/Reader/Config
        [HttpPost("Config")]
        public async Task<IActionResult> SendConfig([FromBody] ReaderConfigDto request)
        {
            var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == request.ReaderId);
            if (reader == null) return NotFound(new { message = "Reader not found" });

            await _mqttPublisher.PublishCommandAsync(request.ReaderId, request.Command, request.Value);

            string title = "สั่งงานอุปกรณ์";
            string msg = $"ส่งคำสั่ง {request.Command} ไปที่ {request.ReaderId}";
            string type = "INFO";

            if (request.Command == "SHUTDOWN")
            {
                reader.IsActive = false;
                reader.IpAddress = "-";
                
                title = "อุปกรณ์ออฟไลน์ (Shutdown)";
                msg = $"⛔ สั่งปิดเครื่อง: {request.ReaderId}";
                type = "DANGER"; 
            }

            // 🔔 แจ้งเตือนสั่งงาน
            _context.Notifications.Add(new Notification 
            {
                UserId = null, RoleId = 1,
                Title = title,
                Message = msg, // ✅ แก้เป็น Message
                Type = type,
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/rfid-connect"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Success" });
        }
    }

    public class ReaderConfigDto { public string ReaderId { get; set; } public string Command { get; set; } public string Value { get; set; } }
}