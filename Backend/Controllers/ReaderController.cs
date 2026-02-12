using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Collections.Generic;

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
        // ดึงข้อมูลเครื่องทั้งหมด (ส่งกลับไปครบทุก Field เพื่อให้หน้า Web เอาไปใช้ต่อได้)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Reader>>> GetReaders()
        {
            return await _context.Readers
                .OrderBy(r => r.ReaderId)
                .ToListAsync();
        }

        // POST: api/Reader
        // เพิ่มเครื่องใหม่
        [HttpPost]
        public async Task<IActionResult> AddReader([FromBody] Reader reader)
        {
            // 1. เช็คชื่อซ้ำ
            if (await _context.Readers.AnyAsync(r => r.ReaderName == reader.ReaderName))
            {
                return BadRequest(new { message = $"ชื่อเครื่อง '{reader.ReaderName}' มีอยู่ในระบบแล้ว" });
            }

            // 2. ตั้งค่า Default
            reader.IsActive = true;
            if (string.IsNullOrEmpty(reader.CurrentMode)) reader.CurrentMode = "Normal";
            if (string.IsNullOrEmpty(reader.ReaderFunction)) reader.ReaderFunction = "CHECK";
            reader.UpdatedAt = ThaiTime(); // บันทึกเวลาล่าสุด

            _context.Readers.Add(reader);
            
            // 🔔 แจ้งเตือนเข้า Notification (Admin)
            _context.Notifications.Add(new Notification 
            {
                UserId = null,  
                RoleId = 1,     // Admin
                Title = "เพิ่มอุปกรณ์ใหม่",
                Message = $"เพิ่มอุปกรณ์: {reader.ReaderName} เข้าสู่ระบบ",
                Type = "INFO",  
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/readers" // ลิงก์ไปหน้าจัดการอุปกรณ์
            });

            await _context.SaveChangesAsync();
            return CreatedAtAction("GetReaders", new { id = reader.ReaderId }, reader);
        }

        // PUT: api/Reader/5
        // แก้ไขข้อมูลเครื่อง
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReader(int id, [FromBody] Reader reader)
        {
            if (id != reader.ReaderId) return BadRequest(new { message = "ID ไม่ตรงกัน" });

            reader.UpdatedAt = ThaiTime(); // อัปเดตเวลาล่าสุด
            _context.Entry(reader).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Readers.Any(e => e.ReaderId == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/Reader/5
        // ลบเครื่อง
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
                Message = $"ลบอุปกรณ์: {reader.ReaderName} ออกจากระบบ",
                Type = "WARNING", 
                IsRead = false,
                CreatedAt = ThaiTime(),
                LinkUrl = "/readers"
            });

            _context.Readers.Remove(reader);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: api/Reader/Config
        // สั่งงานอุปกรณ์ (เช่น Restart, Shutdown)
        [HttpPost("Config")]
        public async Task<IActionResult> SendConfig([FromBody] ReaderConfigDto request)
        {
            var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == request.ReaderId);
            if (reader == null) return NotFound(new { message = "Reader not found" });

            try
            {
                // ส่งคำสั่งผ่าน MQTT (เช่น topic: cmd/Reader1, payload: SHUTDOWN)
                await _mqttPublisher.PublishAsync($"cmd/{request.ReaderId}", request.Command.ToUpper());

                string title = "สั่งงานอุปกรณ์";
                string msg = $"ส่งคำสั่ง {request.Command} ไปที่ {request.ReaderId}";
                string type = "INFO";

                if (request.Command == "SHUTDOWN")
                {
                    reader.IsActive = false; // ปรับสถานะใน DB เป็น Offline
                    reader.UpdatedAt = ThaiTime();
                    
                    title = "อุปกรณ์ออฟไลน์ (Shutdown)";
                    msg = $"⛔ สั่งปิดเครื่อง: {request.ReaderId}";
                    type = "DANGER"; 
                }

                // 🔔 แจ้งเตือนสั่งงาน
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
                return Ok(new { message = "Success" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "MQTT Error: " + ex.Message });
            }
        }
    }

    // ✅ Class DTO ฝากไว้ในไฟล์นี้เลย ง่ายต่อการเรียกใช้
    public class ReaderConfigDto 
    { 
        public string ReaderId { get; set; } = string.Empty;
        public string Command { get; set; } = string.Empty;
        public string? Value { get; set; } 
    }
}