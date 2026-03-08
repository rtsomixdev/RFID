using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers; // To access ProductRulesUpdateDto

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซระบบจัดการข้อมูลเชิงสินค้าเนื้อผ้า ตั้งค่า และกฎเกณฑ์สต็อกเบื้องต้น
    /// </summary>
    public interface IProductService
    {
        /// <summary>
        /// ดึงรายการรูปแบบสินค้าผ้าแต่ละชนิดออกมานำเสนอ
        /// </summary>
        /// <returns>ภาพรวมข้อมูลแค็ตตาล็อกตัวสินค้าทั้งหมด</returns>
        Task<IEnumerable<Product>> GetAsync();

        /// <summary>
        /// ร้องขอข้อมูลผ้าสินค้าที่กำหนดด้วยรหัสบ่งบอกแน่ชัด
        /// </summary>
        /// <param name="id">รหัสสินค้า</param>
        /// <returns>รายละเอียดที่ครบวงจรของชิ้นสินค้านั้น</returns>
        Task<Product?> GetAsync(int id);

        /// <summary>
        /// วางโครงสร้างโมเดลตัวเลือกผ้าแบบใหม่ลงระบบ
        /// </summary>
        /// <param name="item">ข้อบ่งชี้คุณสมบัติสินค้าให้เพิ่มเข้าไป</param>
        /// <returns>ผลบรรจุข้อมูลที่ทำรหัสและรวบสมบูรณ์แล้ว</returns>
        Task<Product> PostAsync(Product item);

        /// <summary>
        /// ปรับปรุงรูปแบบและจำนวนของสินค้า หรืออัปเดตกฎเกณฑ์ส่วนควบขยายใหม่
        /// </summary>
        /// <param name="id">รหัสอ้างอิงสินค้า</param>
        /// <param name="item">ตัวข้อมูลที่สั่งให้เปลี่ยนแปร</param>
        /// <returns>สถานะรวมถึงภาพเปรียบตัวสินค้าย้อนกลับ</returns>
        Task<(int Status, string? Message, Product? Item)> PutAsync(int id, ProductRulesUpdateDto item);

        /// <summary>
        /// ชำระล้างสิทธิประโยชน์รูปแบบสินค้านี้ออกจากข้อมูลพื้นฐาน
        /// </summary>
        /// <param name="id">รหัสอ้างอิง</param>
        /// <returns>ยืนยันทำลายหรือติดขัดการใช้งานส่วนทับซ้อน</returns>
        Task<bool> DeleteAsync(int id);

        /// <summary>
        /// จัดสร้างงบรายงานปริมาณสินค้าสต๊อกจริงเพื่อดาวน์โหลดทำเอกสารภายนอก
        /// </summary>
        /// <returns>พิกัดสถานะตอบกลับพร้อมกรอบตารางออกรายงาน</returns>
        Task<(int Status, string? Message, IEnumerable<object>? Data)> GetStockForExportAsync();
    }
}
