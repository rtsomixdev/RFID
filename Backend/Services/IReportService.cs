using System;
using System.Threading.Tasks;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับรับผิดชอบหน้าที่สร้างรายงานเฉพาะทาง เพื่อเรียกข้อมูลผลผลิตสรุป
    /// </summary>
    public interface IReportService
    {
        /// <summary>
        /// ออกแบบและจัดรูปแบบรายงานความเคลื่อนไหวของการจัดการส่งและรับผ้า
        /// </summary>
        /// <param name="start">วันเริ่มต้นของกรอบการค้น</param>
        /// <param name="end">วันสิ้นสุดของกรอบการค้น</param>
        /// <param name="type">แยกย่อยว่าเป็นกิจกรรมรูปแบบไหน</param>
        /// <returns>ข้อมูลรูปธรรมของตัวรายงานรวมตัวกรอง</returns>
        Task<(int Status, string? Message, object? Data)> GetMovementReportAsync(DateTime? start, DateTime? end, string? type);

        /// <summary>
        /// ออกรายงานและรวบรวมผลลัพธ์ของผ้าที่เสียหาย ชำรุด และไม่สามารถใช้งานได้ต่อไป
        /// </summary>
        /// <param name="start">วันเริ่มต้นกรอบค้นหาผ้าสูญสภาพ</param>
        /// <param name="end">วันสิ้นสุดกรอบค้นหาผ้าสูญสภาพ</param>
        /// <returns>ตารางพร้อมยอดตัวเลขแจกแจงพฤติกรรมความเสียหาย</returns>
        Task<(int Status, string? Message, object? Data)> GetDamagedReportAsync(DateTime? start, DateTime? end);
    }
}
