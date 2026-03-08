using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลสำหรับการรับค่าคำสั่งเพื่อปรับสถานะเป็นอ่านแล้วทั้งหมด
    /// </summary>
    public class MarkAllRequest
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }
    }

    /// <summary>
    /// ควบคุมการจัดการการแจ้งเตือนต่างๆ ภายในระบบ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly Services.INotificationService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ NotificationController
        /// </summary>
        /// <param name="service">บริการสำหรับการแจ้งเตือน</param>
        public NotificationController(Services.INotificationService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงข้อมูลการแจ้งเตือนส่วนตัวและสำหรับบทบาทของผู้ใช้งาน
        /// </summary>
        /// <param name="userId">รหัสผู้ใช้งาน</param>
        /// <param name="roleId">รหัสบทบาท</param>
        /// <returns>รายการแจ้งเตือนทั้งหมดที่เกี่ยวข้อง</returns>
        [HttpGet("MyNotifications")]
        public async Task<IActionResult> GetMyNotifications([FromQuery] int userId, [FromQuery] int roleId)
        {
            var result = await _service.GetMyNotificationsAsync(userId, roleId);
            return Ok(result);
        }

        /// <summary>
        /// ปรับสถานะการแจ้งเตือนรายการเดียวเป็น "อ่านแล้ว"
        /// </summary>
        /// <param name="id">รหัสการแจ้งเตือน</param>
        /// <returns>ผลลัพธ์การปรับสถานะ</returns>
        [HttpPost("Read/{id}")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var success = await _service.MarkAsReadAsync(id);
            if (!success) return NotFound();

            return Ok();
        }

        /// <summary>
        /// ปรับสถานะการแจ้งเตือนทั้งหมดของผู้ใช้งานและระดับบทบาทเป็น "อ่านแล้ว"
        /// </summary>
        /// <param name="data">ข้อมูลสำหรับการค้นหารายการที่เกี่ยวข้อง</param>
        /// <returns>ผลลัพธ์การดำเนินการ</returns>
        [HttpPost("ReadAll")]
        public async Task<IActionResult> MarkAllAsRead([FromBody] MarkAllRequest data)
        {
            await _service.MarkAllAsReadAsync(data);
            return Ok(new { message = "Marked all as read" });
        }
        
        /// <summary>
        /// สร้างการแจ้งเตือนใหม่เข้าสู่ระบบ (สำหรับการเรียกใช้งานภายในระบบ)
        /// </summary>
        /// <param name="noti">ข้อมูลการแจ้งเตือน</param>
        /// <returns>ผลลัพธ์และรายละเอียดที่ถูกสร้าง</returns>
        [HttpPost("Create")]
        public async Task<IActionResult> CreateNotification([FromBody] Notification noti)
        {
            var createdNoti = await _service.CreateNotificationAsync(noti);
            return Ok(createdNoti);
        }
    }
}