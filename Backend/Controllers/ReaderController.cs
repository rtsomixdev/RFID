using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReaderController : ControllerBase
    {
        private readonly LinenDbContext _context;
        private readonly MqttPublisherService _mqttPublisher;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ReaderController(LinenDbContext context, MqttPublisherService mqttPublisher, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _mqttPublisher = mqttPublisher;
            _hubContext = hubContext;
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

            // บังคับตั้งค่าเริ่มต้นให้เป็น "Offline" เสมอเมื่อเพิ่งสร้างใหม่
            reader.IsActive = false; 
            reader.CurrentMode = "โหมดปกติ (Normal)"; // ตั้งเป็นโหมดปกติไว้ก่อน
            
            // ถ้าไม่มีการส่ง IP มา ให้ใส่ขีดแดชไว้ก่อน 
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

        // =============================================
        // POST: api/Reader/Config (สั่งงานอุปกรณ์ WAKE / SLEEP)
        // =============================================
        [HttpPost("Config")]
        public async Task<IActionResult> SendConfig([FromBody] ReaderConfigDto request)
        {
            var reader = await _context.Readers.FirstOrDefaultAsync(r => r.ReaderName == request.ReaderId);
            if (reader == null) return NotFound(new { message = "Reader not found" });

            try
            {
                // ส่งคำสั่ง WAKE หรือ SLEEP ผ่าน MQTT ไปให้ ESP32
                await _mqttPublisher.PublishCommandAsync(request.ReaderId, request.Command.ToUpper(), "", false);

                string title = "สั่งงานอุปกรณ์";
                string msg = $"ส่งคำสั่ง {request.Command} ไปที่ {request.ReaderId}";
                string type = "INFO";

                // จัดการสถานะในระบบ (เปลี่ยนแค่โหมด ห้ามยุ่งกับ IsActive)
                if (request.Command.ToUpper() == "SLEEP")
                {
                    reader.CurrentMode = "โหมดหลับ (SLEEP)";
                    reader.UpdatedAt = ThaiTime(); // ต่อเวลาให้มันด้วย ป้องกันโดนเตะออฟไลน์
                    msg = $"💤 สั่งเข้าโหมดหลับ: {request.ReaderId}";
                    type = "WARNING"; 
                }
                else if (request.Command.ToUpper() == "WAKE")
                {
                    reader.CurrentMode = "โหมดปกติ (Normal)";
                    reader.UpdatedAt = ThaiTime(); // ต่อเวลาให้มันด้วย
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
                
                // ส่ง SignalR ไปบอกหน้าเว็บให้ขยับป้ายโหมดตามคำสั่ง
                await _hubContext.Clients.All.SendAsync("OnModeChanged");

                return Ok(new { message = "Success" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "MQTT Error: " + ex.Message });
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