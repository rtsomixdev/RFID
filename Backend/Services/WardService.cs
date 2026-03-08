using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมข้อมูลหน่วยงานและหอผู้ป่วยตามสายบังคับบัญชา
    /// </summary>
    public class WardService : IWardService
    {
        private readonly LinenDbContext _context;

        public WardService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการวอร์ดหอผู้ป่วยที่สังกัดแต่ละโรงพยาบาล
        /// </summary>
        /// <returns>ตารางรายชื่อหน่วยงานย่อยในความดูแล</returns>
        public async Task<IEnumerable<Ward>> GetWardsAsync()
        {
            return await _context.Wards
                .Include(w => w.Hospital) 
                .OrderBy(w => w.WardName)
                .ToListAsync();
        }

        /// <summary>
        /// เพิ่มหน่วยงานวอร์ดระดับใหม่เข้าสู่แผนผัง
        /// </summary>
        /// <param name="ward">ชุดข้อมูลตัวแทนหอผู้ป่วย</param>
        /// <returns>ประวัติการสร้างและความสำเร็จในการจัดพื้นที่เสริม (Room Sync)</returns>
        public async Task<(int Status, string? Message, Ward? Item)> PostWardAsync(Ward ward)
        {
            if (ward.IsActive == null) ward.IsActive = true;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Wards.Add(ward);
                await _context.SaveChangesAsync(); 

                // ดำเนินการซิงค์สร้างแผนที่ห้องอัตโนมัติหากยังไม่ถือกำเนิด
                var roomExists = await _context.Rooms.AnyAsync(r => r.RoomName == ward.WardName);
                if (!roomExists)
                {
                    var newRoom = new Room
                    {
                        RoomName = ward.WardName,
                        Description = "หอผู้ป่วย (Auto Sync)",
                        WardId = ward.WardId, 
                    };
                    
                    _context.Rooms.Add(newRoom);
                    await _context.SaveChangesAsync(); 
                }

                await transaction.CommitAsync();
                return (201, null, ward);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var realError = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"❌ Save Error: {realError}"); 
                return (500, "บันทึกไม่สำเร็จ: " + realError, null);
            }
        }

        /// <summary>
        /// ถอนวอร์ดหรือหอผู้ป่วยที่ถูกยุบออกจากผังโครงสร้าง
        /// </summary>
        /// <param name="id">รหัสหน่วยงานระดับวอร์ด</param>
        /// <returns>ผลยืนยันการทำลายข้อมูลอย่างสมบูรณ์</returns>
        public async Task<(int Status, string? Message)> DeleteWardAsync(int id)
        {
            var ward = await _context.Wards.FindAsync(id);
            if (ward == null) return (404, null);

            _context.Wards.Remove(ward);
            await _context.SaveChangesAsync();
            return (204, null);
        }
    }
}
