using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการปรับแต่งการตั้งค่าและพารามิเตอร์พื้นฐานระบบ
    /// </summary>
    public class SettingService : ISettingService
    {
        private readonly LinenDbContext _context;

        public SettingService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// เรียกดูหน้าค่าสัมประสิทธิ์การตั้งค่าระบบทั้งหมด
        /// </summary>
        /// <returns>บัญชีรายการตัวแปรตั้งค่าระบบ</returns>
        public async Task<IEnumerable<Setting>> GetSettingsAsync()
        {
            return await _context.Settings.ToListAsync();
        }

        /// <summary>
        /// ปรับค่าตัวแปรการตั้งค่าเดิมให้เป็นค่าใหม่ตามที่ระบุ
        /// </summary>
        /// <param name="setting">ป้ายบันทึกค่าระบบที่แก้ไขแล้ว</param>
        /// <returns>ข้อความสรุปผลลัพธ์การเซฟ</returns>
        public async Task<(int Status, string? Message)> UpdateSettingAsync(Setting setting)
        {
            var existing = await _context.Settings.FindAsync(setting.Id);
            if (existing == null) return (404, "ไม่พบการตั้งค่านี้");

            existing.Value = setting.Value;
            existing.Description = setting.Description; 

            await _context.SaveChangesAsync();
            return (200, "บันทึกการตั้งค่าเรียบร้อย");
        }

        /// <summary>
        /// เพิ่มตัวแปรและกฎประมวลตั้งค่าใหม่เอี่ยมลงในระบบ
        /// </summary>
        /// <param name="setting">ชุดข้อมูลกฎเกณฑ์สำหรับระบบใหม่</param>
        /// <returns>ค่ากำหนดใหม่เพิ่งสร้างเสร็จ</returns>
        public async Task<Setting> CreateSettingAsync(Setting setting)
        {
            _context.Settings.Add(setting);
            await _context.SaveChangesAsync();
            return setting;
        }
    }
}
