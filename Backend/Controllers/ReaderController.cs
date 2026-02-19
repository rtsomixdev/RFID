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
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Reader>>> GetReaders()
        {
            return await _context.Readers
                .OrderBy(r => r.ReaderId)
                .ToListAsync();
        }

        // =============================================
        // POST: api/Reader (เพิ่มเครื่องอ่านใหม่)
        // =============================================
        [HttpPost]
        public async Task<IActionResult> AddReader([FromBody] Reader reader)
        {
            if (await _context.Readers.AnyAsync(r => r.ReaderName == reader.ReaderName))
            {
                return BadRequest(new { message = $"ชื่อเครื่อง '{reader.ReaderName}' มีอยู่ในระบบแล้ว" });
            }

            // ✅ บังคับตั้งค่าเริ่มต้นให้เป็น "Offline" เสมอเมื่อเพิ่งสร้างใหม่
            reader.IsActive = false; 
            reader.CurrentMode = "Offline"; 
            
            // ✅ ถ้าไม่มีการส่ง IP มา ให้ใส่ขีดแดชไว้ก่อน (เดี๋ยวฮาร์ดแวร์ต่อเน็ตแล้วมันจะส่ง IP มาอัปเดตเอง)
            if (string.IsNullOrEmpty(reader.IpAddress))
            {
                reader.IpAddress = "-";
            }

            if (string.IsNullOrEmpty(reader.ReaderFunction)) reader.ReaderFunction = "CHECK";
            reader.UpdatedAt = ThaiTime();

            _context.Readers.Add(reader);
            
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
            return CreatedAtAction("GetReaders", new { id = reader.ReaderId }, reader);
        }

        // PUT: api/Reader/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReader(int id, [FromBody] Reader reader)
        {
            if (id != reader.ReaderId) return BadRequest(new { message = "ID ไม่ตรงกัน" });

            reader.UpdatedAt = ThaiTime();
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
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReader(int id)
        {
            var reader = await _context.Readers.FindAsync(id);
            if (reader == null) return NotFound();

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
        [HttpPost("Config")]
        public async Task<IActionResult> SendConfig([FromBody] ReaderConfigDto request)
        {
            var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == request.ReaderId);
            if (reader == null) return NotFound(new { message = "Reader not found" });

            try
            {
                await _mqttPublisher.PublishAsync($"cmd/{request.ReaderId}", request.Command.ToUpper());

                string title = "สั่งงานอุปกรณ์";
                string msg = $"ส่งคำสั่ง {request.Command} ไปที่ {request.ReaderId}";
                string type = "INFO";

                if (request.Command == "SHUTDOWN")
                {
                    reader.IsActive = false;
                    reader.UpdatedAt = ThaiTime();
                    
                    title = "อุปกรณ์ออฟไลน์ (Shutdown)";
                    msg = $"⛔ สั่งปิดเครื่อง: {request.ReaderId}";
                    type = "DANGER"; 
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
                return Ok(new { message = "Success" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "MQTT Error: " + ex.Message });
            }
        }

        // ✅ POST: api/Reader/Wake/{readerName}
        // สั่งปลุกเครื่อง (Wake Up) และรีเซ็ตเวลา + โหมด
        [HttpPost("Wake/{readerName}")]
        public async Task<IActionResult> WakeReader(string readerName)
        {
            Console.WriteLine($"🔔 Waking up reader: {readerName}");
            
            try 
            {
                // 1. ส่งคำสั่ง WAKE ไปทาง MQTT
                // Hardware จะรับคำสั่งนี้ -> เปิดเสา RFID -> เปิดไฟเขียว
                await _mqttPublisher.PublishCommandAsync(readerName, "WAKE", "1", true);

                // 2. อัปเดต DB (รีเซ็ตเวลา + เปลี่ยนโหมดกลับเป็น Normal)
                var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == readerName);
                if (reader != null)
                {
                    reader.IsActive = true;       // สถานะ Online
                    reader.UpdatedAt = ThaiTime(); // รีเซ็ตเวลานับถอยหลัง (30 วิ)
                    reader.CurrentMode = "Normal"; // ✅ แก้ตรงนี้: ปรับกลับเป็น Normal เพื่อให้พร้อมทำงานและหยุด Loop Sleep
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = $"Sent WAKE command to {readerName} and reset timer." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error waking reader: " + ex.Message });
            }
        }
    }

    public class ReaderConfigDto 
    { 
        public string ReaderId { get; set; } = string.Empty;
        public string Command { get; set; } = string.Empty;
        public string? Value { get; set; } 
    }
}