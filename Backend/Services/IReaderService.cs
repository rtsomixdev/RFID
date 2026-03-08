using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซตัวนำทางบริการบริหารตัวรับรู้ (อุปกรณ์สแกน RFID)
    /// </summary>
    public interface IReaderService
    {
        /// <summary>
        /// ขอเรียกดูรายการอุปกรณ์เครื่องอ่านทุกเครื่องที่ติดตั้งเชื่อมกับระบบไว้
        /// </summary>
        /// <returns>พารามิเตอร์รวบรวมชุดค่าเครื่องสแกนทั้งหมด</returns>
        Task<IEnumerable<Reader>> GetReadersAsync();

        /// <summary>
        /// สมทบรปูแบบอุปกรณ์ตัวใหม่ที่ถูกส่งค่า IP ติดตั้งลงผังระบบ
        /// </summary>
        /// <param name="reader">ร่างข้อกำหนดตัวเครื่องสแกน</param>
        /// <returns>ประเมินเงื่อนไขซ้ำซ้อนรวมถึงการตอบสนองลงตัว</returns>
        Task<(int Status, string? Message, Reader? Item)> AddReaderAsync(Reader reader);

        /// <summary>
        /// รับคำสั่งเปลี่ยนสถานที่ หรือแก้ไขข้อจำเพาะของเครื่อง
        /// </summary>
        /// <param name="id">รหัสตัวเครื่องอ่าน</param>
        /// <param name="reader">รวบรวมข้อมูลใหม่ที่ปรับตั้งค่าชดเชย</param>
        /// <returns>โค้ดข้อตกลงสถานะบ่งส่งความหมายเพื่อผู้ใช้</returns>
        Task<(int Status, string? Message)> UpdateReaderAsync(int id, Reader reader);

        /// <summary>
        /// เอาเครื่องอ่านที่ไม่ประสงค์ใช้งานออกอย่างถาวร (ถ้าสามารถ) ถ่วงดุลรหัส
        /// </summary>
        /// <param name="id">อ้างอิงรหัสอุปกรณ์ภายใน</param>
        /// <returns>การกระทำว่าความถาวรนั้นใช้ได้ผลหรือติดปัญหาข้องเกี่ยว</returns>
        Task<(int Status, string? Message)> DeleteReaderAsync(int id);

        /// <summary>
        /// บริหารเซ็ตติ้งกำลังส่ง ปรับเสา สัญญาณต่างๆ เพื่อชดเชยให้กับอุปกรณ์ปลายทางผ่าน MQTT
        /// </summary>
        /// <param name="request">ตรรกะชุดคอนฟิกปรับตั้งค่าอิงคลื่นแม่เหล็ก</param>
        /// <returns>ส่งกลับสเตตัสความสัมฤทธิ์ผลจากการถ่ายทอดสาร</returns>
        Task<(int Status, string? Message)> SendConfigAsync(ReaderConfigDto request);

        /// <summary>
        /// กระตุ้นสัญญาณให้อุปกรณ์เครื่องอ่านสั่งเปิดโหมดการสแกน (จากระยะไกล)
        /// </summary>
        /// <param name="readerName">ชื่อกำกับอ้างอิงเพื่อปลุกเครื่อง</param>
        /// <returns>ตอบรับการตื่นหรือขัดข้องจากคำสั่ง</returns>
        Task<(int Status, string? Message)> WakeReaderAsync(string readerName);
    }
}
