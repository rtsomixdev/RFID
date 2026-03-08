using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการบริหารจัดการข้อมูลบัญชีผู้ใช้งานและสิทธิเข้าถึงระบบ
    /// </summary>
    public class UserService : IUserService
    {
        private readonly LinenDbContext _context;

        public UserService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการผู้ใช้งานทั้งหมดในระบบ
        /// </summary>
        /// <returns>ชุดข้อมูลพนักงานที่ลงทะเบียนไว้</returns>
        public async Task<IEnumerable<User>> GetUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        /// <summary>
        /// สืบหาข้อมูลของบุคคลผู้ใช้งานรายคน
        /// </summary>
        /// <param name="id">รหัสประจำตัวผู้ใช้งาน</param>
        /// <returns>ข้อมูลบัญชีแสดงรายละเอียดประจำตัวผู้ใช้</returns>
        public async Task<User?> GetUserAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        /// <summary>
        /// แก้ไขปรับปรุงข้อมูลบัญชีผู้ใช้หรือรีเซ็ตรายละเอียด
        /// </summary>
        /// <param name="id">ไอดีผู้ใช้งานที่ต้องการปรับแก้</param>
        /// <param name="user">ข้อมูลบัญชีที่ป้อนมาดัดแปลง</param>
        /// <returns>สถานะความสำเร็จของการจัดเก็บค่า</returns>
        public async Task<(int Status, string? Message)> PutUserAsync(int id, User user)
        {
            if (id != user.UserId)
            {
                return (400, "User ID mismatch");
            }

            var existingUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == id);
            
            if (existingUser == null)
            {
                return (404, "User not found");
            }

            // ปกป้องรหัสผ่านเดิมหากไม่ได้ส่งมาเปลี่ยน
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                user.PasswordHash = existingUser.PasswordHash;
            }

            // ถนอมข้อมูลเวลาและเลขอ้างอิงรักษาความปลอดภัยเดิม
            if (user.CreatedAt == null) user.CreatedAt = existingUser.CreatedAt;
            if (user.OtpCode == null) user.OtpCode = existingUser.OtpCode;
            if (user.OtpExpiry == null) user.OtpExpiry = existingUser.OtpExpiry;
            
            // ป้องกันข้อมูลแหว่งโดยตั้งค่าพิกัดเริ่มต้น
            if (user.HospitalId == null || user.HospitalId == 0) user.HospitalId = 1;
            if (user.WardId == null || user.WardId == 0) user.WardId = 1;

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Users.AnyAsync(e => e.UserId == id)) return (404, "User not found");
                else throw;
            }
            catch (Exception ex)
            {
                return (500, "Database Error: " + ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : ""));
            }

            return (204, null);
        }

        /// <summary>
        /// ลงทะเบียนบัญชีพนักงานใหม่เข้าระบบปฏิบัติการ
        /// </summary>
        /// <param name="user">ข้อมูลและสิทธิตั้งต้น</param>
        /// <returns>ยืนยันการเพิ่มเสร็จสิ้นและคืนค่าอ็อบเจกต์บัญชี</returns>
        public async Task<(int Status, string? Message, User? Item)> PostUserAsync(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            
            // ตั้งสายบังคับบัญชาหรือโรงพยาบาลเริ่มต้นหากเว้นว่าง
            if (user.HospitalId == null || user.HospitalId == 0) user.HospitalId = 1;
            if (user.WardId == null || user.WardId == 0) user.WardId = 1;

            _context.Users.Add(user);
            try 
            {
                await _context.SaveChangesAsync();
                return (201, null, user);
            }
            catch (Exception ex)
            {
                 return (500, "Database Error: " + ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : ""), null);
            }
        }

        /// <summary>
        /// ถอนสิทธิ์ปลดพนักงานออกจากฐานชื่อระบบ
        /// </summary>
        /// <param name="id">รหัสตั๋วพนักงานที่ต้องการล้างตา</param>
        /// <returns>ลบประวัติบัญชีการทำงานสำเร็จ</returns>
        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
