using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซที่ควบคุมการจัดการโรงพยาบาลและสาขา
    /// </summary>
    public interface IHospitalService
    {
        /// <summary>
        /// ติดต่อและดึงข้อมูลสาขาโรงพยาบาลมารวมไว้ทั้งหมด
        /// </summary>
        /// <returns>รายชื่อของโรงพยาบาลที่มีในระบบ</returns>
        Task<IEnumerable<Hospital>> GetAsync();

        /// <summary>
        /// ระบุรหัสเป้าหมายของโรงพยาบาล
        /// </summary>
        /// <param name="id">รหัสรับรองตัวตนสาขา</param>
        /// <returns>ค้นหาข้อมูลเจอหรือไม่เจอจากระบบ</returns>
        Task<Hospital?> GetAsync(int id);

        /// <summary>
        /// บันทึกโครงสร้างตัวสาขาโรงพยาบาลใหม่
        /// </summary>
        /// <param name="item">อ็อบเจ็กต์ข้อมูลโรงพยาบาล</param>
        /// <returns>รับข้อมูลย้อนกลับเพื่อส่งคืนผู้ใช้งาน</returns>
        Task<Hospital> PostAsync(Hospital item);

        /// <summary>
        /// ปรับเปลี่ยนข้อมูลเป้าหมายโรงพยาบาลที่มีอยู่แล้ว
        /// </summary>
        /// <param name="id">จุดประสงค์ ID อ้างอิง</param>
        /// <param name="item">โหมดข้อมูลที่รับมาเพื่อที่จะแก้ไข</param>
        /// <returns>บอกสถานะว่าเปลี่ยนแปลงได้ตามคาดหวังหรือไม่ (HTTP status, Message, Data)</returns>
        Task<(int Status, string? Message, Hospital? Item)> PutAsync(int id, Hospital item);

        /// <summary>
        /// นำข้อมูลสาขาโรงพยาบาลเหล่านั้นออกอย่างถาวร (ถ้าสามารถลบได้)
        /// </summary>
        /// <param name="id">รหัสชี้เป้าโรงพยาบาล</param>
        /// <returns>ส่งสัญญาณกลับบอกโค้ดและความล้มเหลวเพื่อโชว์เตือน</returns>
        Task<(int Status, string? Message)> DeleteAsync(int id);
    }
}
