using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Controllers; // To access LaundryRequestDto

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริการจัดการระบบซักรีดและคัดแยกผ้า
    /// </summary>
    public interface ILaundryService
    {
        /// <summary>
        /// ตรวจสอบประวัติสิ่งผ้านี้จากรหัส RFID
        /// </summary>
        /// <param name="rfid">รหัสประจำชิ้นผ้า</param>
        /// <returns>สถานะ, ข้อความบรรยาย และเนื้อหาข้อมูลประวัติ</returns>
        Task<(int Status, string? Message, object? Data)> CheckLinenAsync(string rfid);

        /// <summary>
        /// กำหนดกลุ่มผ้าที่ต้องส่งล้างทำความสะอาด
        /// </summary>
        /// <param name="request">ชุดคำสั่งระบุผ้าที่จะซัก</param>
        /// <returns>ผลตอบรับการรับเข้าระบบและปริมาณยอดสุทธิที่ตรวจพบ</returns>
        Task<(int Status, string? Message, int Count)> SendToWashAsync(LaundryRequestDto request);

        /// <summary>
        /// รับผ้ากลับคืนจากการทำความสะอาด
        /// </summary>
        /// <param name="request">กลุ่มรหัสผ้าที่มาถึงสถานที่ปลายทาง</param>
        /// <returns>ตัวชี้วัดความน่าเชื่อถือของการดำเนินกระบวนการนับผ้าสะอาด</returns>
        Task<(int Status, string? Message, int Count)> ReceiveCleanAsync(LaundryRequestDto request);

        /// <summary>
        /// จัดเตรียมชุดผ้าที่สอดคล้องกับคุณสมบัติต่อการซัก
        /// </summary>
        /// <param name="mode">ระบุว่าต้องการผ้าประเภทไหน</param>
        /// <returns>รวบรวมข้อมูลสถานการณ์ของผ้าสำหรับการเข้าห้องซัก</returns>
        Task<(int Status, IEnumerable<object>? Data)> GetCandidatesAsync(string mode);

        /// <summary>
        /// ดึงรายการผ้าที่ยังค้างอยู่ในกระบวนการซัก
        /// </summary>
        /// <returns>รายการตรวจสอบสเตตัสในระหว่างกระบวนการ</returns>
        Task<IEnumerable<object>> GetWashingListAsync();

        /// <summary>
        /// ระงับขั้นตอนการซักของชิ้นผ้าจากระบบและตั้งค่ากลับไปสถานะตั้งต้น
        /// </summary>
        /// <param name="rfidCodes">อาร์เรย์ที่พกพารหัสของผ้าที่มีการส่งยกเลิก</param>
        /// <returns>สำเร็จการยกเลิกพร้อมกับจำนวนชิ้น</returns>
        Task<(int Status, string? Message, int Count)> CancelLaundryAsync(List<string> rfidCodes);
    }
}
