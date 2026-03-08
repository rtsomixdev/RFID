using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซควบคุมการทำงานที่เกี่ยวข้องกับโปรไฟล์ผู้ใช้งานของระบบ
    /// </summary>
    public interface IUserService
    {
        /// <summary>
        /// เรียกข้อมูลรายชื่อผู้ใช้งานพนักงานทั้งหมดที่ผูกกับระบบนี้
        /// </summary>
        /// <returns>เซ็ตข้อมูลสมาชิกบัญชีใช้งานทุกคน</returns>
        Task<IEnumerable<User>> GetUsersAsync();

        /// <summary>
        /// ขอรายละเอียดผู้ใช้งานรายบุคคลแบบเจาะจงค้นหา
        /// </summary>
        /// <param name="id">หมายเลขประทับผู้ใช้งาน</param>
        /// <returns>ประวัติและข้อมูลแสดงตัวตนสิทธิผู้รับเหมา</returns>
        Task<User?> GetUserAsync(int id);

        /// <summary>
        /// อัปเดตแฟ้มข้อมูลและการเข้าถึงสิทธิ์ของผู้ใช้งานนั้น ๆ
        /// </summary>
        /// <param name="id">รหัสไอดีบัญชีที่ต้องการแก้ไข</param>
        /// <param name="user">ก้อนข้อมูลโปรไฟล์ปรับปรุงใหม่</param>
        /// <returns>ข้อมูลการยืนยันถึงฐานข้อมูลเพื่อแก้ไขอัปเดต</returns>
        Task<(int Status, string? Message)> PutUserAsync(int id, User user);

        /// <summary>
        /// ต้อนรับเพิ่มบัญชีพนักงานหรือสมาชิกใหม่เข้าระบบและให้สิทธิ์เข้าใช้
        /// </summary>
        /// <param name="user">รหัสผู้ใช้ รหัสผ่าน และข้อกำหนดโครงร่าง</param>
        /// <returns>แจ้งเตือนและแชร์ข้อเท็จจริงโครงสร้างอ็อบเจกต์ที่ทำรหัสเสร็จ</returns>
        Task<(int Status, string? Message, User? Item)> PostUserAsync(User user);

        /// <summary>
        /// เพิกถอนสิทธิ์อย่างถาวรโดยลบประวัติบัญชี
        /// </summary>
        /// <param name="id">หมายเลขอ้างอิงบัญชีผู้ลบ</param>
        /// <returns>ความสามารถหรือผลกระทบที่อาจไม่ให้ลบ</returns>
        Task<bool> DeleteUserAsync(int id);
    }
}
