using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมข้อมูลเรื่องคำนำหน้าชื่อหรือระดับชั้นบุคลากร
    /// </summary>
    public class TitleService : ITitleService
    {
        private readonly LinenDbContext _context;

        public TitleService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการคำนำหน้าและตำแหน่งวิทยฐานะทั้งหมด
        /// </summary>
        /// <returns>ชุดตัวเลือกคำนำหน้าชื่อ</returns>
        public async Task<IEnumerable<Title>> GetAsync()
        {
            return await _context.Titles.ToListAsync();
        }

        /// <summary>
        /// แสดงบันทึกข้อมูลคำนำหน้าเฉพาะที่ต้องการเป้าหมาย
        /// </summary>
        /// <param name="id">จุดอ้างอิงคำนำหน้า</param>
        /// <returns>ชื่อและรายละเอียดตำแหน่งฐานะ</returns>
        public async Task<Title?> GetAsync(int id)
        {
            return await _context.Titles.FindAsync(id);
        }

        /// <summary>
        /// สร้างและเติมรายการคำนำหน้าใหม่ในระบบ
        /// </summary>
        /// <param name="item">อ็อบเจกต์หน้าคำตั้งชื่อบุคลากรใหม่</param>
        /// <returns>ข้อมูลสถิติบันทึกเสร็จ</returns>
        public async Task<Title> PostAsync(Title item)
        {
            _context.Titles.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงคำนำหน้าหรือแก้คำสะกดแปลตัวหมวด
        /// </summary>
        /// <param name="id">รหัสหมวดคำนำหน้าที่มุ่งหมาย</param>
        /// <param name="item">ข้อความและรายละเอียดใหม่</param>
        /// <returns>ความคล่องตัวที่บันทึกข้อมูลสำเร็จ</returns>
        public async Task<bool> PutAsync(int id, Title item)
        {
            if (id != item.TitleId) return false;

            _context.Entry(item).State = EntityState.Modified;
            
            try 
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Titles.AnyAsync(t => t.TitleId == id)) return false;
                else throw;
            }
        }

        /// <summary>
        /// ลบข้อมูลโครงร่างตำแหน่งคำนำหน้าชื่อนั้น
        /// </summary>
        /// <param name="id">รหัสนำหน้าเป้าหมายล้างข้อมูล</param>
        /// <returns>การทำลายข้อมูลสมบูรณ์</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.Titles.FindAsync(id);
            if (item == null) return false;

            _context.Titles.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
