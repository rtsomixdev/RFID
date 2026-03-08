using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับจัดการหมวดหมู่สินค้าหรือผ้า
    /// </summary>
    public interface ICategoryService
    {
        /// <summary>
        /// ดึงข้อมูลหมวดหมู่ทั้งหมด
        /// </summary>
        /// <returns>รายการหมวดหมู่ที่มีในระบบ</returns>
        Task<IEnumerable<Category>> GetAsync();

        /// <summary>
        /// ดึงข้อมูลหมวดหมู่เฉพาะรายการ
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่</param>
        /// <returns>หมวดหมู่ที่ต้องการค้นหา</returns>
        Task<Category?> GetAsync(int id);

        /// <summary>
        /// สร้างหมวดหมู่ใหม่
        /// </summary>
        /// <param name="item">ข้อมูลหมวดหมู่ใหม่</param>
        /// <returns>ข้อมูลหมวดหมู่ที่บันทึกแล้ว</returns>
        Task<Category> PostAsync(Category item);

        /// <summary>
        /// อัปเดตข้อมูลหมวดหมู่
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่ที่ต้องการอัปเดต</param>
        /// <param name="item">ข้อมูลที่ต้องการแก้ไข</param>
        /// <returns>ความสำเร็จของการอัปเดตข้อมูล</returns>
        Task<bool> PutAsync(int id, Category item);

        /// <summary>
        /// ลบข้อมูลหมวดหมู่
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่</param>
        /// <returns>ความสำเร็จของการลบข้อมูล</returns>
        Task<bool> DeleteAsync(int id);
    }
}
