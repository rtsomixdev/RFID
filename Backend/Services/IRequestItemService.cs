using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการรายการย่อยในใบคำขอ
    /// </summary>
    public interface IRequestItemService
    {
        /// <summary>
        /// ดึงรายการย่อยของคำขอทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลรายการย่อยทั้งหมด</returns>
        Task<IEnumerable<RequestItem>> GetAsync();

        /// <summary>
        /// ดึงข้อมูลรายการย่อยของคำขอเจาะจงตามรหัส
        /// </summary>
        /// <param name="id">รหัสรายการย่อยในคำขอ</param>
        /// <returns>ข้อมูลรายการย่อยเป้าหมาย</returns>
        Task<RequestItem?> GetAsync(long id);

        /// <summary>
        /// สร้างข้อมูลรายการย่อยลงในใบคำขอ
        /// </summary>
        /// <param name="item">ข้อมูลรายการย่อยใหม่</param>
        /// <returns>ข้อมูลที่ถูกสร้างในระบบ</returns>
        Task<RequestItem> PostAsync(RequestItem item);

        /// <summary>
        /// แก้ไขข้อมูลรายการย่อยในใบคำขอ
        /// </summary>
        /// <param name="id">รหัสรายการย่อยที่ต้องการอัปเดต</param>
        /// <param name="item">เนื้อหาหรือข้อมูลใหม่ที่นำมาแทนที่</param>
        /// <returns>สถานะบอกความสำเร็จในการบันทึก</returns>
        Task<bool> PutAsync(long id, RequestItem item);

        /// <summary>
        /// ลบข้อมูลรายการย่อยออกจากใบคำขอ
        /// </summary>
        /// <param name="id">รหัสรายการที่ต้องการลบ</param>
        /// <returns>ความสำเร็จจากการลบข้อมูล</returns>
        Task<bool> DeleteAsync(long id);
    }
}
