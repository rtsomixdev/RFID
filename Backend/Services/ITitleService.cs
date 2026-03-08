using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการคำนำหน้าชื่อหรือตำแหน่งบุคคล
    /// </summary>
    public interface ITitleService
    {
        /// <summary>
        /// ดึงรายการส่วนคำนำหน้าทั้งหมดในระบบ
        /// </summary>
        /// <returns>รวมแบบรายชื่อคำนำหน้าที่มีอยู่</returns>
        Task<IEnumerable<Title>> GetAsync();

        /// <summary>
        /// ดึงความหมายคำนำหน้าด้วยเลขรหัสชี้เป้า
        /// </summary>
        /// <param name="id">รหัสจำแนกคำนำหน้า</param>
        /// <returns>รายการข้อความคำนำหน้านั้น</returns>
        Task<Title?> GetAsync(int id);

        /// <summary>
        /// เพิ่มรูปแบบข้อความคำนำหน้าชื่อตัวใหม่
        /// </summary>
        /// <param name="item">ข้อความตำแหน่งคำนำหน้า</param>
        /// <returns>ร่องรอยคลาสของคำนำหน้าที่เพิ่งถูกจัดสร้าง</returns>
        Task<Title> PostAsync(Title item);

        /// <summary>
        /// แก้ไขคำนำหน้าที่มีอยู่แล้วเพื่อเปลี่ยนแปลงตัวสะกด
        /// </summary>
        /// <param name="id">รหัสตั้งต้นอ้างอิง</param>
        /// <param name="item">ข้อความข้อมูลคำนำหน้าชุดใหม่</param>
        /// <returns>ผลแห่งการยืนยันการตั้งค่าแก้ไขเป็นผล</returns>
        Task<bool> PutAsync(int id, Title item);

        /// <summary>
        /// ลบข้อมูลโครงสร้างคำนำหน้าอันใดหนึ่งออก
        /// </summary>
        /// <param name="id">รหัสข้อมูลที่ต้องการนำออกไป</param>
        /// <returns>ข้อยกเว้นหรือความสำเร็จจากการลบ</returns>
        Task<bool> DeleteAsync(int id);
    }
}
