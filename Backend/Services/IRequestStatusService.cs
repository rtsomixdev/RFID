using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารตั้งค่าสถานะที่เป็นไปได้ของใบคำขอ
    /// </summary>
    public interface IRequestStatusService
    {
        /// <summary>
        /// ดึงสถานะใบคำขอทั้งหมดที่มีในสารบบ
        /// </summary>
        /// <returns>รายการสถานะคำขอ</returns>
        Task<IEnumerable<RequestStatus>> GetAsync();

        /// <summary>
        /// ดึงข้อมูลสถานะเฉพาะตัว
        /// </summary>
        /// <param name="id">รหัสตัวสถานะ</param>
        /// <returns>รูปแบบข้อมูลของสถานะ</returns>
        Task<RequestStatus?> GetAsync(int id);

        /// <summary>
        /// เพิ่มหมวดสถานะใบคำขอใหม่
        /// </summary>
        /// <param name="item">นิยามตัวสถานะใหม่</param>
        /// <returns>ข้อมูลการบันทึกสถานะ</returns>
        Task<RequestStatus> PostAsync(RequestStatus item);

        /// <summary>
        /// ปรับปรุงรูปแบบตัวสถานะที่มีอยู่แล้ว
        /// </summary>
        /// <param name="id">รหัสสถานะดั้งเดิม</param>
        /// <param name="item">ข้อความข้อมูลสถานะชุดที่ปรับแล้ว</param>
        /// <returns>ระบุว่ามีการดัดแปลงโครงสร้างนี้สำเร็จ</returns>
        Task<bool> PutAsync(int id, RequestStatus item);

        /// <summary>
        /// นำสถานะใบคำขอนี้ออกไปจากสารบบ
        /// </summary>
        /// <param name="id">รหัสสถานะ</param>
        /// <returns>บ่งชี้ว่าลบผ่านพ้นไปได้ด้วยดีหรือไม่</returns>
        Task<bool> DeleteAsync(int id);
    }
}
