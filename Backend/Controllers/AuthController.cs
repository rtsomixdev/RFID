using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly LinenDbContext _context;
    private readonly EmailService _emailService;

    public AuthController(LinenDbContext context)
    {
        _context = context;
        _emailService = new EmailService();
    }

    // 1. ขอ OTP
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto model)
    {
        // ค้นหา User จาก Email
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        if (user == null)
        {
            return NotFound(new { message = "ไม่พบอีเมลนี้ในระบบ" });
        }

        // สร้าง OTP 6 หลัก
        var otp = new Random().Next(0, 999999).ToString("D6");
        
        // บันทึกลง DB (หมดอายุใน 5 นาที)
        user.OtpCode = otp;
        user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
        await _context.SaveChangesAsync();

        // ส่งเมล
        try {
            await _emailService.SendOtpEmailAsync(user.Email, otp);
            return Ok(new { message = "ส่งรหัส OTP ไปยังอีเมลเรียบร้อยแล้ว" });
        } catch {
            return StatusCode(500, new { message = "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่" });
        }
    }

    // 2. ยืนยัน OTP
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        
        if (user == null || user.OtpCode != model.Otp)
            return BadRequest(new { message = "รหัส OTP ไม่ถูกต้อง" });

        if (user.OtpExpiry < DateTime.UtcNow)
            return BadRequest(new { message = "รหัส OTP หมดอายุแล้ว" });

        return Ok(new { message = "ยืนยัน OTP สำเร็จ" });
    }

    // 3. เปลี่ยนรหัสผ่านใหม่
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

        if (user == null || user.OtpCode != model.Otp || user.OtpExpiry < DateTime.UtcNow)
            return BadRequest(new { message = "Session หมดอายุ กรุณาขอ OTP ใหม่" });

        // อัปเดตรหัสผ่าน
        user.PasswordHash = model.NewPassword;
        
        // ล้าง OTP
        user.OtpCode = null;
        user.OtpExpiry = null;
        
        await _context.SaveChangesAsync();

        return Ok(new { message = "เปลี่ยนรหัสผ่านสำเร็จ" });
    }
}

// DTO Classes
public class RequestOtpDto { public string Email { get; set; } }
public class VerifyOtpDto { public string Email { get; set; } public string Otp { get; set; } }
public class ResetPasswordDto { public string Email { get; set; } public string Otp { get; set; } public string NewPassword { get; set; } }