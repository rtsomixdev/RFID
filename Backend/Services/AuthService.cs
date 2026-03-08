using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;
using System.Data;

namespace Backend.Services
{
    /// <summary>
    /// บริการสำหรับการจัดการกระบวนการยืนยันตัวตนและการตรวจสอบสิทธิ์
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly LinenDbContext _context;
        private readonly EmailService _emailService;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ AuthService
        /// </summary>
        /// <param name="context">บริบทของฐานข้อมูล</param>
        public AuthService(LinenDbContext context)
        {
            _context = context;
            _emailService = new EmailService(); 
        }

        /// <summary>
        /// ดำเนินการเข้าสู่ระบบเข้าใช้งานและตรวจสอบสิทธิ์ของผู้ใช้งาน
        /// </summary>
        /// <param name="request">ข้อมูลบัญชีผู้ใช้งานและรหัสผ่าน</param>
        /// <returns>สถานะการยืนยันตัวตนพร้อมสิทธิ์การเข้าถึง</returns>
        public async Task<(int Status, string? Message, User? User, List<string>? Permissions)> LoginAsync(LoginDto request)
        {
            var user = await _context.Users
                .Include(u => u.Role) 
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || user.PasswordHash != request.Password)
                return (401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", null, null);

            if (user.IsActive == false)
                return (401, "บัญชีนี้ถูกระงับการใช้งาน", null, null);

            var permissions = new List<string>();
            try 
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    // ค้นหาสิทธิ์ที่ผูกกับบทบาทของผู้ใช้งาน
                    cmd.CommandText = @"
                        SELECT p.permission_code 
                        FROM public.permissions p
                        JOIN public.role_permissions rp ON p.permission_id = rp.permission_id
                        WHERE rp.role_id = @roleId";

                    var param = cmd.CreateParameter();
                    param.ParameterName = "@roleId";
                    param.Value = user.RoleId ?? 0;
                    cmd.Parameters.Add(param);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            if (!reader.IsDBNull(0))
                            {
                                permissions.Add(reader.GetString(0));
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return (500, "DB Error: " + ex.Message, null, null);
            }

            return (200, null, user, permissions);
        }

        /// <summary>
        /// สร้างและส่งรหัสผ่านใช้ครั้งเดียว (OTP) ไปยังอีเมล
        /// </summary>
        /// <param name="model">ข้อมูลคำขอ OTP พร้อมอีเมล</param>
        /// <returns>สถานะการส่งอีเมล</returns>
        public async Task<(int Status, string? Message)> RequestOtpAsync(RequestOtpDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null) return (404, "ไม่พบอีเมลนี้ในระบบ");

            // สุ่มสร้างรหัสความยาว 6 หลัก
            var otp = new Random().Next(0, 999999).ToString("D6");
            
            user.OtpCode = otp;
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
            await _context.SaveChangesAsync();

            try {
                await _emailService.SendOtpEmailAsync(user.Email, otp);
                return (200, "ส่งรหัส OTP ไปยังอีเมลเรียบร้อยแล้ว");
            } catch {
                return (500, "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่");
            }
        }

        /// <summary>
        /// ตรวจสอบความถูกต้องของรหัส OTP ที่ผู้ใช้นำมากรอก
        /// </summary>
        /// <param name="model">ข้อมูลการยืนยันรหัสพร้อมอีเมล</param>
        /// <returns>สถานะลัพธ์การยืนยัน</returns>
        public async Task<(int Status, string? Message)> VerifyOtpAsync(VerifyOtpDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            
            if (user == null || user.OtpCode != model.Otp)
                return (400, "รหัส OTP ไม่ถูกต้อง");

            if (user.OtpExpiry < DateTime.UtcNow)
                return (400, "รหัส OTP หมดอายุแล้ว");

            return (200, "ยืนยัน OTP สำเร็จ");
        }

        /// <summary>
        /// เริ่มต้นการตั้งค่ารหัสผ่านใหม่หลังจากยืนยัน OTP สำเร็จ
        /// </summary>
        /// <param name="model">รูปแบบคำขอแจ้งตั้งรหัสผ่านใหม่</param>
        /// <returns>ผลการอัปเดตรหัสผ่านใหม่ลงฐานข้อมูล</returns>
        public async Task<(int Status, string? Message)> ResetPasswordAsync(ResetPasswordDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null || user.OtpCode != model.Otp || user.OtpExpiry < DateTime.UtcNow)
                return (400, "Session หมดอายุ กรุณาขอ OTP ใหม่");

            user.PasswordHash = model.NewPassword;
            user.OtpCode = null;
            user.OtpExpiry = null;
            await _context.SaveChangesAsync();

            return (200, "เปลี่ยนรหัสผ่านสำเร็จ");
        }
    }
}
