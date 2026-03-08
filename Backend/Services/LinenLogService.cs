using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการบันทึกประวัติและพฤติกรรมการใช้งานผ้า
    /// </summary>
    public class LinenLogService : ILinenLogService
    {
        private readonly LinenDbContext _context;

        public LinenLogService(LinenDbContext context) => _context = context;

        /// <summary>
        /// ดึงประวัติรายการเคลื่อนไหวของผ้า 100 รายการล่าสุด
        /// </summary>
        /// <returns>ชุดข้อมูลประวัติของผ้า</returns>
        public async Task<IEnumerable<LinenLog>> GetAsync() => 
            await _context.LinenLogs.OrderByDescending(x => x.LogId).Take(100).ToListAsync();
        
        /// <summary>
        /// ดึงข้อมูลประวัติการทำรายการของผ้าตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสอ้างอิงของประวัติ</param>
        /// <returns>ข้อมูลประวัติแบบเจาะจงรายการ</returns>
        public async Task<LinenLog?> GetAsync(long id) => 
            await _context.LinenLogs.FindAsync(id);
        
        /// <summary>
        /// สร้างและบันทึกข้อมูลประวัติการทำรายการครั้งใหม่
        /// </summary>
        /// <param name="item">อ็อบเจกต์ประวัติรายการเข้าออกของผ้า</param>
        /// <returns>ข้อมูลประวัติรายการที่เสร็จสมบูรณ์</returns>
        public async Task<LinenLog> PostAsync(LinenLog item)
        {
            _context.LinenLogs.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงข้อมูลเจาะจงของบางประวัติที่ลงบันทึกไว้
        /// </summary>
        /// <param name="id">รหัสอ้างอิงประวัติรายการ</param>
        /// <param name="item">โมเดลข้อมูลรายการชุดที่จะแทนที่</param>
        /// <returns>คืนค่าความสำเร็จหรือล้มเหลวในการแก้ไขข้อมูล</returns>
        public async Task<bool> PutAsync(long id, LinenLog item)
        {
            // ตรวจสอบความถูกต้องของเลขรหัส
            if (id != item.LogId) return false;
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// ลบข้อมูลประวัติการทำรายการแบบเจาะจง
        /// </summary>
        /// <param name="id">รหัสอ้างอิงของข้อมูลบรรทัดนั้น</param>
        /// <returns>คืนสถานะการล้างข้อมูลเป้าหมายสำเร็จ</returns>
        public async Task<bool> DeleteAsync(long id)
        {
            var item = await _context.LinenLogs.FindAsync(id);
            if (item == null) return false;
            _context.LinenLogs.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
