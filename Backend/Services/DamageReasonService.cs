using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการข้อมูลเหตุผลความเสียหาย หรือรายละเอียดการทิ้งรายการผ้า
    /// </summary>
    public class DamageReasonService : IDamageReasonService
    {
        private readonly LinenDbContext _context;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ DamageReasonService
        /// </summary>
        /// <param name="context">บริบทของฐานข้อมูล</param>
        public DamageReasonService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการเหตุผลความเสียหายทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลระดับเหตุผล</returns>
        public async Task<IEnumerable<DamageReason>> GetAsync()
        {
            return await _context.DamageReasons.ToListAsync();
        }

        /// <summary>
        /// ค้นหาข้อมูลสาเหตุความเสียหายตามรหัส
        /// </summary>
        /// <param name="id">รหัสของสาเหตุการความเสียหาย</param>
        /// <returns>ข้อมูลสาเหตุที่พบ</returns>
        public async Task<DamageReason?> GetAsync(int id)
        {
            return await _context.DamageReasons.FindAsync(id);
        }

        /// <summary>
        /// อัปโหลดข้อมูลรายการสาเหตุใหม่
        /// </summary>
        /// <param name="item">ประเภทสาเหตุการความเสียหายใหม่</param>
        /// <returns>ข้อมูลสาเหตุการความเสียหายที่ถูกตั้งค่าแล้ว</returns>
        public async Task<DamageReason> PostAsync(DamageReason item)
        {
            _context.DamageReasons.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// แก้ไขรายละเอียดสาเหตุความเสียหายที่มีอยู่
        /// </summary>
        /// <param name="id">รหัสอ้างอิงของสถานะ</param>
        /// <param name="item">ข้อมูลทดแทนที่จะเอามาแก้ไข</param>
        /// <returns>สถานะความสำเร็จในการปรับข้อมูล</returns>
        public async Task<bool> PutAsync(int id, DamageReason item)
        {
            if (id != item.ReasonId) return false;
            
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// นำข้อมูลสาเหตุความเสียหายออกจากระบบ
        /// </summary>
        /// <param name="id">รหัสเป้าหมายที่ต้องการนำออก</param>
        /// <returns>สถานะลัพธ์การชี้ชัดกระบวนการลบ</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.DamageReasons.FindAsync(id);
            if (item == null) return false;
            
            _context.DamageReasons.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
