using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับตรวจสอบระดับความเสียหายของเนื้อผ้า
    /// </summary>
    public interface IDamageReasonService
    {
        /// <summary>
        /// นำข้อมูลสาเหตุการชำรุดทั้งหมดมาแสดงผล
        /// </summary>
        /// <returns>เหตุผลทั้งหมดที่มีเก็บในระบบ</returns>
        Task<IEnumerable<DamageReason>> GetAsync();

        /// <summary>
        /// เลือกข้อมูลสาเหตุด้วยรหัสรับรอง
        /// </summary>
        /// <param name="id">รหัสของเหตุผลความเสียหาย</param>
        /// <returns>แบบแผนข้อมูลเหตุผลชำรุด</returns>
        Task<DamageReason?> GetAsync(int id);

        /// <summary>
        /// ส่งและเพิ่มเหตุผลชุดใหม่
        /// </summary>
        /// <param name="item">ข้อความประกอบเหตุผล</param>
        /// <returns>สิ่งที่ได้บันทึกลงไปในฐานข้อมูลสำเร็จ</returns>
        Task<DamageReason> PostAsync(DamageReason item);

        /// <summary>
        /// แก้ไขตัวเลือกระดับความเสียหายที่มีอยู่
        /// </summary>
        /// <param name="id">รหัสดั้งเดิม</param>
        /// <param name="item">โครงสร้างใหม่</param>
        /// <returns>รับรู้สถานะจริง/เท็จหลังกระบวนการ</returns>
        Task<bool> PutAsync(int id, DamageReason item);

        /// <summary>
        /// เอาตัวเลือกระดับความเสียหายออกไปจากฐานข้อมูล
        /// </summary>
        /// <param name="id">เป้าหมายที่จะลบ</param>
        /// <returns>เสร็จสมบูรณ์หรือล้มเหลว</returns>
        Task<bool> DeleteAsync(int id);
    }
}
