using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับบริการจัดการการยืนยันตัวตนและการเข้าถึง
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน
        /// </summary>
        /// <param name="request">ข้อมูลบัญชีผู้ใช้งาน</param>
        /// <returns>สถานะ, ข้อความ, ข้อมูลผู้ใช้ และสิทธิ์การใช้งาน</returns>
        Task<(int Status, string? Message, User? User, List<string>? Permissions)> LoginAsync(LoginDto request);

        /// <summary>
        /// ขอรับรหัส OTP ผ่านอีเมล
        /// </summary>
        /// <param name="model">ข้อมูลที่ประกอบด้วยอีเมล</param>
        /// <returns>สถานะและข้อความแจ้งผลการส่ง</returns>
        Task<(int Status, string? Message)> RequestOtpAsync(RequestOtpDto model);

        /// <summary>
        /// ยืนยันรหัส OTP ที่ได้รับ
        /// </summary>
        /// <param name="model">ข้อมูลที่ประกอบด้วยอีเมลและรหัส OTP</param>
        /// <returns>สถานะและข้อความแจ้งผลการตรวจสอบ</returns>
        Task<(int Status, string? Message)> VerifyOtpAsync(VerifyOtpDto model);

        /// <summary>
        /// ตั้งค่ารหัสผ่านใหม่
        /// </summary>
        /// <param name="model">ข้อมูลอีเมล, รหัส OTP ที่ผ่านแล้ว และรหัสผ่านใหม่</param>
        /// <returns>สถานะและข้อความแจ้งผลการเปลี่ยนรหัสผ่าน</returns>
        Task<(int Status, string? Message)> ResetPasswordAsync(ResetPasswordDto model);
    }
}
