using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการสำหรับการจัดการข้อมูลสถานพยาบาลและโรงพยาบาลในเครือ
    /// </summary>
    public class HospitalService : IHospitalService
    {
        private readonly LinenDbContext _context;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ HospitalService
        /// </summary>
        /// <param name="context">บริบทของฐานข้อมูล</param>
        public HospitalService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการข้อมูลโรงพยาบาลทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลโรงพยาบาลในระบบทั้งหมด</returns>
        public async Task<IEnumerable<Hospital>> GetAsync()
        {
            return await _context.Hospitals.ToListAsync();
        }

        /// <summary>
        /// ดึงข้อมูลโรงพยาบาลจากรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาล</param>
        /// <returns>ข้อมูลของโรงพยาบาลเป้าหมาย</returns>
        public async Task<Hospital?> GetAsync(int id)
        {
            return await _context.Hospitals.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มสถานพยาบาลแห่งใหม่
        /// </summary>
        /// <param name="item">ข้อมูลของสถานพยาบาลใหม่</param>
        /// <returns>บันทึกเสร็จสิ้นส่งข้อมูลโรงพยาบาลใหม่กลับมา</returns>
        public async Task<Hospital> PostAsync(Hospital item)
        {
            _context.Hospitals.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// แก้ไขข้อมูลสถานพยาบาล
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาล</param>
        /// <param name="item">ชุดข้อมูลใหม่ที่ปรับค่า</param>
        /// <returns>สถานะลัพธ์การแก้ไข</returns>
        public async Task<(int Status, string? Message, Hospital? Item)> PutAsync(int id, Hospital item)
        {
            if (id != item.HospitalId) return (400, "ID ไม่ตรงกัน", null);

            var existingHospital = await _context.Hospitals.FindAsync(id);
            if (existingHospital == null) return (404, "ไม่พบข้อมูลโรงพยาบาล", null);

            existingHospital.HospitalName = item.HospitalName;
            existingHospital.Address = item.Address;
            existingHospital.ContactInfo = item.ContactInfo;
            
            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Hospitals.AnyAsync(e => e.HospitalId == id)) return (404, null, null);
                else throw;
            }

            return (200, null, existingHospital);
        }

        /// <summary>
        /// ลบข้อมูลโรงพยาบาลรวมถึงตรวจเงื่อนไขการเกี่ยวข้อง
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาลที่ต้องลบ</param>
        /// <returns>แสดงสถานะการล้างข้อมูลโรงพยาบาลอย่างปลอดภัย</returns>
        public async Task<(int Status, string? Message)> DeleteAsync(int id)
        {
            // ตรวจสอบเช็คความสัมพันธ์ที่ต้องระงับก่อนจะทำการลบทิ้ง
            var hasWards = await _context.Wards.AnyAsync(w => w.HospitalId == id);
            if (hasWards) return (400, "ลบไม่ได้: มีวอร์ด/แผนก สังกัดโรงพยาบาลนี้อยู่");

            var hasUsers = await _context.Users.AnyAsync(u => u.HospitalId == id);
            if (hasUsers) return (400, "ลบไม่ได้: มีบุคลากรสังกัดโรงพยาบาลนี้อยู่");

            var hasLinens = await _context.Linens.AnyAsync(l => l.HospitalId == id);
            if (hasLinens) return (400, "ลบไม่ได้: มีรายการผ้าของโรงพยาบาลนี้อยู่ในระบบ");

            var item = await _context.Hospitals.FindAsync(id); 
            if (item == null) return (404, null); 

            _context.Hospitals.Remove(item); 
            await _context.SaveChangesAsync(); 
            
            return (204, null);
        }
    }
}
