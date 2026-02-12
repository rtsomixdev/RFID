using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Data; // ⚠️ สำคัญมาก: ต้องมีบรรทัดนี้ ไม่งั้น Error

namespace Backend.Controllers;

// DTO สำหรับ Login
public class LoginDto
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}

// DTO เดิมของคุณ
public class RequestOtpDto { public string Email { get; set; } = null!; }
public class VerifyOtpDto { public string Email { get; set; } = null!; public string Otp { get; set; } = null!; }
public class ResetPasswordDto { public string Email { get; set; } = null!; public string Otp { get; set; } = null!; public string NewPassword { get; set; } = null!; }

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

    // ==========================================
    // 🔥 1. LOGIN (เวอร์ชันสมบูรณ์: ดึงจาก DB จริง + แก้ JSON Error)
    // ==========================================
    [HttpPost("Login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        // 1. เช็ค User
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || user.PasswordHash != request.Password)
            return Unauthorized(new { message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

        if (user.IsActive == false)
            return Unauthorized(new { message = "บัญชีนี้ถูกระงับการใช้งาน" });

        // 2. ดึง Permissions จริงจาก Database (ใช้ ADO.NET เพื่อความชัวร์ 100%)
        var permissions = new List<string>();
        try 
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            using (var cmd = conn.CreateCommand())
            {
                // ดึงสิทธิ์ทั้งหมดที่ Role นี้มี จากตาราง public.permissions
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
            return StatusCode(500, new { message = "DB Error: " + ex.Message });
        }

        // 3. ส่งข้อมูลกลับ
        return Ok(new
        {
            Token = "mock-token-12345",
            User = new
            {
                user.UserId,
                user.Username,
                user.FirstName,
                user.LastName,
                user.RoleId,
                // ✅ จุดสำคัญ: ส่ง Permissions แค่ตัวเดียว (ระบบจะแปลงเป็นตัวเล็ก permissions ให้อัตโนมัติ)
                Permissions = permissions 
            }
        });
    }

    // ==========================================
    // 2. ขอ OTP (ของเดิม)
    // ==========================================
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        if (user == null)
        {
            return NotFound(new { message = "ไม่พบอีเมลนี้ในระบบ" });
        }

        var otp = new Random().Next(0, 999999).ToString("D6");
        
        user.OtpCode = otp;
        user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
        await _context.SaveChangesAsync();

        try {
            await _emailService.SendOtpEmailAsync(user.Email, otp);
            return Ok(new { message = "ส่งรหัส OTP ไปยังอีเมลเรียบร้อยแล้ว" });
        } catch {
            return StatusCode(500, new { message = "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่" });
        }
    }

    // ==========================================
    // 3. ยืนยัน OTP (ของเดิม)
    // ==========================================
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

    // ==========================================
    // 4. เปลี่ยนรหัสผ่านใหม่ (ของเดิม)
    // ==========================================
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);

        if (user == null || user.OtpCode != model.Otp || user.OtpExpiry < DateTime.UtcNow)
            return BadRequest(new { message = "Session หมดอายุ กรุณาขอ OTP ใหม่" });

        user.PasswordHash = model.NewPassword;
        
        user.OtpCode = null;
        user.OtpExpiry = null;
        
        await _context.SaveChangesAsync();

        return Ok(new { message = "เปลี่ยนรหัสผ่านสำเร็จ" });
    }
}