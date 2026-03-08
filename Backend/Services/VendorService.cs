using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมประวัติและรายชื่อบริษัทคู่ค้าภายนอก
    /// </summary>
    public class VendorService : IVendorService
    {
        private readonly LinenDbContext _context;

        public VendorService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// แสดงรายการหน่วยบริการบริษัทจัดหาทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลหุ้นส่วนคู่ค้าที่มีในระบบ</returns>
        public async Task<IEnumerable<Vendor>> GetAsync()
        {
            return await _context.Vendors.ToListAsync();
        }

        /// <summary>
        /// ค้นหาประวัติคู่ค้ารายบริษัทเป็นการเฉพาะ
        /// </summary>
        /// <param name="id">เลขอ้างอิงบริษัท</param>
        /// <returns>รายละเอียดที่ลงบัญชีของบริษัทนั้น</returns>
        public async Task<Vendor?> GetAsync(int id)
        {
            return await _context.Vendors.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มคู่ค้าบริษัทหรือตัวแทนจัดจำหน่ายรายใหม่
        /// </summary>
        /// <param name="item">อ็อบเจกต์ข้อมูลประกอบนิติบุคคล</param>
        /// <returns>โมเดลตอบกลับพร้อมแจ้งสถานะเพิ่มใหม่สำเร็จ</returns>
        public async Task<(int Status, string? Message, Vendor? Item)> PostAsync(Vendor item)
        {
            try 
            {
                _context.Vendors.Add(item); 
                await _context.SaveChangesAsync(); 
                return (201, null, item);
            }
            catch (Exception ex)
            {
                return (500, "เพิ่มข้อมูลไม่สำเร็จ: " + ex.Message, null);
            }
        }

        /// <summary>
        /// แก้ไขปรับปรุงเลขทะเบียนหรือป้ายชื่อคู่ค้า
        /// </summary>
        /// <param name="id">รหัสบริษัทที่ตรงตัว</param>
        /// <param name="item">ตัวข้อมูลที่ปรับปรุงมาใหม่แล้ว</param>
        /// <returns>สถานะความก้าวหน้าการแก้ไข</returns>
        public async Task<(int Status, string? Message, Vendor? Item)> PutAsync(int id, Vendor item)
        {
            if (id != item.VendorId) return (400, "ID ไม่ตรงกัน", null); 

            var existingVendor = await _context.Vendors.FindAsync(id);
            if (existingVendor == null) return (404, "ไม่พบข้อมูลบริษัทนี้", null);

            existingVendor.VendorName = item.VendorName;
            existingVendor.RegistrationNumber = item.RegistrationNumber;
            // (ถ้ามี field อื่นให้เพิ่มตรงนี้)

            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Vendors.AnyAsync(e => e.VendorId == id)) return (404, null, null);
                else throw;
            }

            return (200, null, existingVendor);
        }

        /// <summary>
        /// ขับไล่และลบประวัติบริษัทตัวแทนจัดจำหน่าย
        /// </summary>
        /// <param name="id">รหัสเป้าหมายคู่ค้า</param>
        /// <returns>ความสำเร็จหรือปฏิเสธหากบริษัทยังถูกผูกพันธะในระบบผ้า</returns>
        public async Task<(int Status, string? Message)> DeleteAsync(int id)
        {
            // ตรวจสอบเชือกผูกพันกันระหว่างบริษัทกับประวัติพลาธิการผ้า
            var isUsedInLinens = await _context.Linens.AnyAsync(l => l.VendorId == id);
            
            if (isUsedInLinens)
            {
                return (400, "ไม่สามารถลบได้ เนื่องจากมีรายการผ้าที่ผูกกับบริษัทนี้อยู่ในระบบ");
            }

            var item = await _context.Vendors.FindAsync(id); 
            if (item == null) return (404, null); 

            _context.Vendors.Remove(item); 
            await _context.SaveChangesAsync(); 
            
            return (204, null);
        }
    }
}
