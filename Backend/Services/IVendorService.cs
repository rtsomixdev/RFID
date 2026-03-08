using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการบัญชีรายชื่อคู่ค้า หรือซัพพลายเออร์ที่บริการจัดส่ง
    /// </summary>
    public interface IVendorService
    {
        /// <summary>
        /// จัดเรียงรายชื่อร้านค้า หรือคู้ค้าที่มีในเอกสารทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลรวมบริษัทกลุ่มคู่ค้าซัพพลายเออร์</returns>
        Task<IEnumerable<Vendor>> GetAsync();

        /// <summary>
        /// สำรวจข้อมูลเฉพาะประวัติบริษัทของคู่ค้านั้น ๆ
        /// </summary>
        /// <param name="id">หมายเลขพิกัด</param>
        /// <returns>รายละเอียดซัพพลายเออร์ระดับตัวเดี่ยว</returns>
        Task<Vendor?> GetAsync(int id);

        /// <summary>
        /// ผูกสัญญาสร้างข้อมูลซัพพลายเออร์รายใหม่
        /// </summary>
        /// <param name="item">ชื่อและที่ติดต่อบัญชีร้านค้า</param>
        /// <returns>ข้อมูลร้านค้ากลับคืนพร้อมสถานะกำกับ</returns>
        Task<(int Status, string? Message, Vendor? Item)> PostAsync(Vendor item);

        /// <summary>
        /// แก้ไขช่องทางการติดต่อของซัพพลายเออร์ที่ลงประวัติไว้
        /// </summary>
        /// <param name="id">รหัสเดิมของผู้ขาย</param>
        /// <param name="item">บันทึกข้อความที่ต้องการใช้ปรับป้อน</param>
        /// <returns>ผลการวิเคราะห์แจ้งเตือนกรณีสำเร็จผ่านเข้า</returns>
        Task<(int Status, string? Message, Vendor? Item)> PutAsync(int id, Vendor item);

        /// <summary>
        /// ยุติความเป็นหุ้นส่วนหรือข้อมูลธุรกิจนี้ออกจากข้อมูลพื้นฐาน
        /// </summary>
        /// <param name="id">รหัสธุรกิจที่จะตัดชิ้นส่วน</param>
        /// <returns>ประเมินผ่านความเป็นไปได้ว่าผูกลบพ้นทางหรือไม่</returns>
        Task<(int Status, string? Message)> DeleteAsync(int id);
    }
}
