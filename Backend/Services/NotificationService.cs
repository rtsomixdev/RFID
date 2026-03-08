using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการระบบการแจ้งเตือนและการสื่อสารภายใน
    /// </summary>
    public class NotificationService : INotificationService
    {
        private readonly LinenDbContext _context;

        public NotificationService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// เรียกดูการแจ้งเตือนของผู้ใช้งานหรือตามกลุ่มบทบาท
        /// </summary>
        /// <param name="userId">รหัสผู้ใช้งาน</param>
        /// <param name="roleId">รหัสบทบาท</param>
        /// <returns>รายการแจ้งเตือนล่าสุดพร้อมจำนวนที่ยังไม่ได้อ่าน</returns>
        public async Task<object> GetMyNotificationsAsync(int userId, int roleId)
        {
            // ดึงข้อมูลการแจ้งเตือนล่าสุด 20 รายการ
            var notis = await _context.Notifications
                .Where(n => n.UserId == userId || (n.UserId == null && n.RoleId == roleId))
                .OrderByDescending(n => n.CreatedAt)
                .Take(20)
                .ToListAsync();

            // นับจำนวนการแจ้งเตือนที่ยังคงไม่อ่าน
            var unreadCount = await _context.Notifications
                .Where(n => (n.UserId == userId || (n.UserId == null && n.RoleId == roleId)) && !n.IsRead)
                .CountAsync();

            return new { notifications = notis, unreadCount };
        }

        /// <summary>
        /// ระบุเครื่องหมายว่าอ่านคำแจ้งเตือนรายการนี้แล้ว
        /// </summary>
        /// <param name="id">รหัสประจำการแจ้งเตือน</param>
        /// <returns>สถานะความสำเร็จการอัปเดต</returns>
        public async Task<bool> MarkAsReadAsync(int id)
        {
            var noti = await _context.Notifications.FindAsync(id);
            if (noti == null) return false;

            noti.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// รับรองการแจ้งเตือนทั้งหมดว่าอ่านครบแล้วรวดเดียว
        /// </summary>
        /// <param name="data">พารามิเตอร์ของผู้ทำการระบุอ่านแล้วทั้งหมด</param>
        /// <returns>เครื่องยืนยันสถานะความสำเร็จของคำขอทั้งหมด</returns>
        public async Task<bool> MarkAllAsReadAsync(MarkAllRequest data)
        {
            // กวาดค้นหาการแจ้งเตือนย้อนหลังที่ยังไม่ถูกอ่าน
            var notis = await _context.Notifications
                .Where(n => (n.UserId == data.UserId || (n.UserId == null && n.RoleId == data.RoleId)) && !n.IsRead)
                .ToListAsync();

            if (notis.Any())
            {
                foreach (var n in notis) n.IsRead = true;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        /// <summary>
        /// ส่งและสร้างหัวข้อกระจายข่าวสารแจ้งเตือน
        /// </summary>
        /// <param name="noti">บันทึกข้อมูลรายละเอียดของประกาศข้อความ</param>
        /// <returns>ข้อมูลการแจ้งเตือนหลังเสร็จสิ้นกระบวนการเพิ่มบรรทัด</returns>
        public async Task<Notification> CreateNotificationAsync(Notification noti)
        {
            noti.CreatedAt = DateTime.UtcNow.AddHours(7); 
            noti.IsRead = false;
            
            _context.Notifications.Add(noti);
            await _context.SaveChangesAsync();
            return noti;
        }
    }
}
