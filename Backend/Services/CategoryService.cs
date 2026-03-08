using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการสำหรับการจัดการข้อมูลหมวดหมู่สินค้า
    /// </summary>
    public class CategoryService : ICategoryService
    {
        private readonly LinenDbContext _context;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ CategoryService
        /// </summary>
        /// <param name="context">บริบทของฐานข้อมูล</param>
        public CategoryService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการหมวดหมู่ทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลหมวดหมู่สินค้า</returns>
        public async Task<IEnumerable<Category>> GetAsync()
        {
            return await _context.Categories.ToListAsync();
        }

        /// <summary>
        /// ดึงข้อมูลหมวดหมู่ตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่</param>
        /// <returns>รายละเอียดหมวดหมู่ที่ตรงตามรหัส</returns>
        public async Task<Category?> GetAsync(int id)
        {
            return await _context.Categories.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มหมวดหมู่ใหม่
        /// </summary>
        /// <param name="item">ข้อมูลหมวดหมู่ที่ต้องการเพิ่ม</param>
        /// <returns>ข้อมูลที่เพิ่มสำเร็จ</returns>
        public async Task<Category> PostAsync(Category item)
        {
            _context.Categories.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงแก้ไขข้อมูลหมวดหมู่
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่ที่ต้องการแก้ไข</param>
        /// <param name="item">ข้อมูลใหม่</param>
        /// <returns>สถานะความสำเร็จในการแก้ไข</returns>
        public async Task<bool> PutAsync(int id, Category item)
        {
            if (id != item.CategoryId) return false;
            
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// ลบข้อมูลหมวดหมู่
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่ที่ต้องการลบ</param>
        /// <returns>สถานะผลลัพธ์การลบ</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.Categories.FindAsync(id);
            if (item == null) return false;
            
            _context.Categories.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
