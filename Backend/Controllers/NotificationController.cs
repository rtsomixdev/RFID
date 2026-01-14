using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public NotificationController(LinenDbContext context)
        {
            _context = context;
        }

        // GET: ดึงแจ้งเตือนของ "ฉัน" (User หรือ Role ของฉัน)
        [HttpGet("MyNotifications")]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int userId, [FromQuery] int roleId)
        {
            // Logic: ดึงของที่ระบุ UserId ตรงตัว OR ของที่ระบุ RoleId ตรงกับฉัน
            var notis = await _context.Notifications
                .Where(n => n.UserId == userId || (n.UserId == null && n.RoleId == roleId))
                .OrderByDescending(n => n.CreatedAt)
                .Take(20) // ดึงมาแค่ 20 อันล่าสุดพอ
                .ToListAsync();

            var unreadCount = await _context.Notifications
                .Where(n => (n.UserId == userId || (n.UserId == null && n.RoleId == roleId)) && !n.IsRead)
                .CountAsync();

            return Ok(new { notifications = notis, unreadCount });
        }

        // POST: อ่านแล้ว (Mark as Read)
        [HttpPost("Read/{id}")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var noti = await _context.Notifications.FindAsync(id);
            if (noti == null) return NotFound();

            noti.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: อ่านทั้งหมด
        [HttpPost("ReadAll")]
        public async Task<IActionResult> MarkAllAsRead([FromBody] dynamic data)
        {
            int userId = data.userId;
            int roleId = data.roleId;

            var notis = await _context.Notifications
                .Where(n => (n.UserId == userId || (n.UserId == null && n.RoleId == roleId)) && !n.IsRead)
                .ToListAsync();

            foreach (var n in notis) n.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok();
        }
        
        // POST: สร้าง Notification (เอาไว้ให้ Controller อื่นเรียกใช้ หรือ Test)
        [HttpPost("Create")]
        public async Task<IActionResult> CreateNotification(Notification noti)
        {
            noti.CreatedAt = DateTime.UtcNow.AddHours(7);
            _context.Notifications.Add(noti);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}