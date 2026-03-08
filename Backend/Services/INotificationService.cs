using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการการแจ้งเตือนและการรับทราบข้อความจากระบบ
    /// </summary>
    public interface INotificationService
    {
        /// <summary>
        /// สืบค้นการแจ้งเตือนทั้งหมดที่เกี่ยวข้องกับผู้ใช้งานคนนั้นแบบตรงตัว
        /// </summary>
        /// <param name="userId">รหัสผู้ใช้งาน</param>
        /// <param name="roleId">สิทธิ์บทบาทที่สวมอยู่</param>
        /// <returns>รายการข้อความที่ยังไม่ได้เปิดรับทราบและการเตือนทั้งหมด</returns>
        Task<object> GetMyNotificationsAsync(int userId, int roleId);

        /// <summary>
        /// สั่งการรับทราบประกาศหรือข้อความนั้นรายตัว
        /// </summary>
        /// <param name="id">รหัสหมายเหตุประกาศเตือน</param>
        /// <returns>สำเร็จในการเปลี่ยนความอ่านแล้วเป็นจริง</returns>
        Task<bool> MarkAsReadAsync(int id);

        /// <summary>
        /// สั่งรับทราบข้อความที่ตกค้างทั้งหมดของผู้ใช้งานเป็นทำคำสั่งในระดับครั้งเดียว
        /// </summary>
        /// <param name="data">ตัวแปรโครงสร้างของผู้ใช้งาน</param>
        /// <returns>ล้างสถานะข้อความใหม่ให้ทั้งหมดได้หมดจด</returns>
        Task<bool> MarkAllAsReadAsync(MarkAllRequest data);

        /// <summary>
        /// ให้ระบบสร้างข่าวสารแจ้งไปยังผู้ใช้งานที่เกี่ยวข้องได้ด้วยตัวเอง
        /// </summary>
        /// <param name="noti">ข้อมูลเบื้องต้นของสิ่งเตือนภัยที่จะก่อรูป</param>
        /// <returns>ผลพลอยส่งข้อมูลลงสู่ฐานเพื่อใช้แจงให้รับทราบต่อไป</returns>
        Task<Notification> CreateNotificationAsync(Notification noti);
    }
}
