using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการและสืบค้นรายการสิ่งของย่อยในแต่ละใบเบิก
    /// </summary>
    public class RequestItemService : IRequestItemService
    {
        private readonly LinenDbContext _context;

        public RequestItemService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// เรียกข้อมูลย่อยของรายการเบิกทั้งหมดที่มีในระบบ
        /// </summary>
        /// <returns>ชุดข้อมูลรายการของที่ถูกขอเบิก</returns>
        public async Task<IEnumerable<RequestItem>> GetAsync()
        {
            return await _context.RequestItems.ToListAsync();
        }

        /// <summary>
        /// ดึงข้อมูลรายการขอบริการเบิกแบบรายชิ้น
        /// </summary>
        /// <param name="id">รหัสอ้างอิงของรายการย่อย</param>
        /// <returns>ข้อมูลรายละเอียดความต้องการของผ้านั้น</returns>
        public async Task<RequestItem?> GetAsync(long id)
        {
            return await _context.RequestItems.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มรายการเพื่อบรรจุขอผ้าลงในระบบใบสั่ง
        /// </summary>
        /// <param name="item">แบบแผนรายละเอียดที่ต้องการเบิก</param>
        /// <returns>ข้อมูลการลงบันทึกรายการบรรทัดใหม่</returns>
        public async Task<RequestItem> PostAsync(RequestItem item)
        {
            _context.RequestItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// แก้ไขจำนวนหรือแก้ไขข้อมูลของสิ่งของที่มีการร้องขอไปแล้ว
        /// </summary>
        /// <param name="id">รหัสอ้างอิงบรรทัดรายการ</param>
        /// <param name="item">อ็อบเจกต์ชิ้นผ้าที่แก้ไข</param>
        /// <returns>สถานะความสำเร็จของการแก้ไขข้อมูล</returns>
        public async Task<bool> PutAsync(long id, RequestItem item)
        {
            if (id != item.ItemId) return false;

            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// ลบทิ้งรายการของบรรทัดที่ไม่ต้องการจะเบิกแล้ว
        /// </summary>
        /// <param name="id">เลขอ้างอิงบรรทัด</param>
        /// <returns>สถานะลบสำเร็จแล้วหรือไม่</returns>
        public async Task<bool> DeleteAsync(long id)
        {
            var item = await _context.RequestItems.FindAsync(id);
            if (item == null) return false;

            _context.RequestItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
