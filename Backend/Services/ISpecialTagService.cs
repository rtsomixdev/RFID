using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการแท็กและสัญลักษณ์พิเศษ
    /// </summary>
    public interface ISpecialTagService
    {
        /// <summary>
        /// ดึงข้อมูลรายการป้ายหรือแท็กพิเศษทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลประเภทแท็กพิเศษบนระบบ</returns>
        Task<IEnumerable<SpecialTag>> GetSpecialTagsAsync();

        /// <summary>
        /// ดึงข้อมูลรายการแท็กพิเศษตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสแท็กอักษร</param>
        /// <returns>ข้อมูลตัวแท็กพิเศษที่เรียกค้น</returns>
        Task<SpecialTag?> GetSpecialTagAsync(string id);

        /// <summary>
        /// เพิ่มประเภทหรือป้ายแท็กแบบพิเศษรายการใหม่ลงระบบ
        /// </summary>
        /// <param name="tag">อ็อบเจกต์รายละเอียดแท็ก</param>
        /// <returns>รายงานสถานะพร้อมแนบข้อมูลแท็กที่สร้างสำเร็จ</returns>
        Task<(int Status, string? Message, SpecialTag? Item)> PostSpecialTagAsync(SpecialTag tag);

        /// <summary>
        /// แก้ไขรายละเอียดหรือชื่อของหมายเหตุแท็ก
        /// </summary>
        /// <param name="id">รหัสแท็ก</param>
        /// <param name="tag">โครงสร้างข้อมูลบรรจุข้อความแก้ไข</param>
        /// <returns>สถานะความสำเร็จของกระบวนการอัปเดต</returns>
        Task<(int Status, string? Message)> PutSpecialTagAsync(string id, SpecialTag tag);

        /// <summary>
        /// นำระเบียนข้อมูลแท็กอันนี้ลบออกจากฐานข้อมูล
        /// </summary>
        /// <param name="id">เลขชี้แจงแท็กเป้าหมาย</param>
        /// <returns>ผลยืนยันการทำลายข้อมูลหรือความผิดพลาด</returns>
        Task<(int Status, string? Message)> DeleteSpecialTagAsync(string id);
    }
}
