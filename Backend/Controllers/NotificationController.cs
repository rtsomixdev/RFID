using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    // Class สำหรับรับค่าตอนกด "อ่านทั้งหมด"
    public class MarkAllRequest
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public NotificationController(LinenDbContext context)
        {
            _context = context;
        }

        // GET: api/Notification/MyNotifications?userId=1&roleId=2
        [HttpGet("MyNotifications")]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int userId, [FromQuery] int roleId)
        {
            var notis = await _context.Notifications
                // Logic: ดึงของฉัน (UserId ตรง) OR ของแผนกฉัน (RoleId ตรง)
                .Where(n => n.UserId == userId || (n.UserId == null && n.RoleId == roleId))
                .OrderByDescending(n => n.CreatedAt)
                .Take(20)
                .ToListAsync();

            var unreadCount = await _context.Notifications
                .Where(n => (n.UserId == userId || (n.UserId == null && n.RoleId == roleId)) && !n.IsRead)
                .CountAsync();

            return Ok(new { notifications = notis, unreadCount });
        }

        // POST: api/Notification/Read/5
        [HttpPost("Read/{id}")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var noti = await _context.Notifications.FindAsync(id);
            if (noti == null) return NotFound();

            noti.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: api/Notification/ReadAll
        [HttpPost("ReadAll")]
        public async Task<IActionResult> MarkAllAsRead([FromBody] MarkAllRequest data)
        {
            var notis = await _context.Notifications
                .Where(n => (n.UserId == data.UserId || (n.UserId == null && n.RoleId == data.RoleId)) && !n.IsRead)
                .ToListAsync();

            if (notis.Any())
            {
                foreach (var n in notis) n.IsRead = true;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Marked all as read" });
        }
        
        // POST: api/Notification/Create (สำหรับ System เรียกใช้)
        [HttpPost("Create")]
        public async Task<IActionResult> CreateNotification([FromBody] Notification noti)
        {
            // แปลงเวลาให้เป็นปัจจุบัน (หรือ +7 ชั่วโมงถ้า Server เป็น UTC แต่เราอยากเก็บ Local time)
            noti.CreatedAt = DateTime.UtcNow.AddHours(7); 
            noti.IsRead = false;
            
            _context.Notifications.Add(noti);
            await _context.SaveChangesAsync();
            return Ok(noti);
        }
    }
}