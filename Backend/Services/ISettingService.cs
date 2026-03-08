using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารส่วนกลางของการตั้งค่าพารามิเตอร์พื้นฐานประจำระบบ
    /// </summary>
    public interface ISettingService
    {
        /// <summary>
        /// อ้างอิงและบรรจุค่าคอนฟิกตัวตั้งต้นทั้งหมดที่ผูกพันกับเซิร์ฟเวอร์
        /// </summary>
        /// <returns>โครงสร้างตัวแปรตัวตั้งค่าประจำระบบ</returns>
        Task<IEnumerable<Setting>> GetSettingsAsync();

        /// <summary>
        /// นำคีย์หรือค่าของตัวตั้งค่าที่มีไปปรับเปลี่ยนเป็นปริมาณ/ข้อจำกัดใหม่
        /// </summary>
        /// <param name="setting">ระบบคอนฟิกที่แฝงไปด้วยการปรับแต่งเสร็จ</param>
        /// <returns>สถานะรหัสตกลงเห็นพ้องและตัวความสำเร็จ</returns>
        Task<(int Status, string? Message)> UpdateSettingAsync(Setting setting);

        /// <summary>
        /// เพิ่มองค์ประกอบทางตัวแปรให้กับการตั้งค่าแบบส่วนขยาย
        /// </summary>
        /// <param name="setting">เนื้อหาค่าจำเพาะรวมคีย์ค่าใหม่</param>
        /// <returns>โมเดลสเตตัสการตั้งค่าซึ่งเกิดจากการสร้างล่าสุด</returns>
        Task<Setting> CreateSettingAsync(Setting setting);
    }
}
