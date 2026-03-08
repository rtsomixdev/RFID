using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับจัดการประวัติและบันทึกข้อมูลการเคลื่อนไหวของผ้า
    /// </summary>
    public interface ILinenLogService
    {
        /// <summary>
        /// ดึงรายการประวัติการเคลื่อนไหวทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลประวัติผ้าสะสมรวมทั้งหมด</returns>
        Task<IEnumerable<LinenLog>> GetAsync();

        /// <summary>
        /// ค้นหาประวัติการเคลื่อนไหวแบบเจาะจงด้วยรหัสอ้างอิง
        /// </summary>
        /// <param name="id">รหัสหมวดบันทึกประวัติ</param>
        /// <returns>ข้อมูลการเคลื่อนไหวตามที่มีในบันทึก</returns>
        Task<LinenLog?> GetAsync(long id);

        /// <summary>
        /// เพิ่มบันทึกเหตุการณ์ประวัติผ้าแบบจานด่วน
        /// </summary>
        /// <param name="item">บันทึกเหตุการณ์ใหม่</param>
        /// <returns>ข้อมูลเหตุการณ์ที่พึ่งจะสร้างใหม่เสร็จ</returns>
        Task<LinenLog> PostAsync(LinenLog item);

        /// <summary>
        /// แก้ไขปรับแต่งเนื้อหาประวัติการบันทึก
        /// </summary>
        /// <param name="id">รหัสกำกับบันทึก</param>
        /// <param name="item">รูปแบบรายการที่ถูกต้อง</param>
        /// <returns>สถานะลัพธ์สำหรับส่งคืนหาลูกค้า</returns>
        Task<bool> PutAsync(long id, LinenLog item);

        /// <summary>
        /// ล้างทำความสะอาดบันทึกประวัติออกจากประบบ
        /// </summary>
        /// <param name="id">รหัสบันทึก</param>
        /// <returns>ความสำเร็จจากการลบตามประสงค์</returns>
        Task<bool> DeleteAsync(long id);
    }
}
