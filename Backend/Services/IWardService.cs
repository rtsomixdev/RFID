using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซที่ควบคุมดูแลและรักษาการหมวดหมู่วอร์ด (Ward) ทุกสาขา
    /// </summary>
    public interface IWardService
    {
        /// <summary>
        /// ตรวจสอบและดึงรหัสวอร์ดรวมทั้งชื่อทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลของวอร์ดผู้ป่วยทั้งหมดจัดโดยรวม</returns>
        Task<IEnumerable<Ward>> GetWardsAsync();

        /// <summary>
        /// นำเสนอสร้างกลุ่มวอร์ดโรงพยาบาลแผนกใหม่เพื่อการจัดเก็บ
        /// </summary>
        /// <param name="ward">ชื่อโครงสร้างวอร์ด</param>
        /// <returns>ความสำเร็จพร้อมระเบียนวอร์ดที่จะนำไปใช้งาน</returns>
        Task<(int Status, string? Message, Ward? Item)> PostWardAsync(Ward ward);

        /// <summary>
        /// นำวอร์ดที่ไม่ใช้นี้ออกไปจากหน้าจอถาวร ยกปัญหาเมื่อวอร์ดยังเกี่ยวพัน
        /// </summary>
        /// <param name="id">รหัสชี้เป้าหมวดหมู่วอร์ด</param>
        /// <returns>สถานะประยุกต์ส่งคืนรวมทั้งเหตุผลเชิงตรรกะว่าลบไม่ได้</returns>
        Task<(int Status, string? Message)> DeleteWardAsync(int id);
    }
}
