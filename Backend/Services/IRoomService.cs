using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซดูแลและจัดการข้อมูลสถานที่เก็บหรือห้องพัก
    /// </summary>
    public interface IRoomService
    {
        /// <summary>
        /// แสดงรายการห้องและพื้นที่ทั้งหมด
        /// </summary>
        /// <returns>กลุ่มรายชื่อสถานที่และห้องในระบบ</returns>
        Task<IEnumerable<Room>> GetAsync();

        /// <summary>
        /// ระบุพิกัดห้องหรือสถานที่ด้วยรหัสระบุพื้นที่
        /// </summary>
        /// <param name="id">หมายเลขตัวห้อง</param>
        /// <returns>แบบแพลนห้องที่ถูกเรียก</returns>
        Task<Room?> GetAsync(int id);

        /// <summary>
        /// สร้างแหล่งสถานที่หรือกำหนดห้องแห่งใหม่
        /// </summary>
        /// <param name="item">ชื่อห้องและวอร์ดที่สังกัด</param>
        /// <returns>ผลยืนยันการเพิ่มระเบียนห้อง</returns>
        Task<Room> PostAsync(Room item);

        /// <summary>
        /// แก้ไขตัวชื่อหรือสังกัดวอร์ดของห้องนั้น
        /// </summary>
        /// <param name="id">รหัสดั้งเดิมของตัวห้อง</param>
        /// <param name="item">แผนการแก้ไขที่ปรับป้อน</param>
        /// <returns>การลงความเห็นว่าสำเร็จไปสู่พื้นที่เก็บข้อมูล</returns>
        Task<bool> PutAsync(int id, Room item);

        /// <summary>
        /// นำตัวเลือกห้องและสถานที่ลบหนีออกจากระบบ
        /// </summary>
        /// <param name="id">เลขชี้เป้าห้อง</param>
        /// <returns>สถานะแสดงว่ามีผลบังคับลบเรียบร้อย</returns>
        Task<bool> DeleteAsync(int id);
    }
}
