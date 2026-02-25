using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Data; 
using System.Security.Claims; // ✅ เพิ่มบรรทัดนี้
using Microsoft.AspNetCore.Authentication.Cookies; // ✅ เพิ่มบรรทัดนี้
using Microsoft.AspNetCore.Authentication; // ✅ เพิ่มบรรทัดนี้

namespace Backend.Controllers;

public class LoginDto
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}

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
    // 🔥 1. LOGIN (Session Cookie + RoleName)
    // ==========================================
    [HttpPost("Login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        // 1. เช็ค User พร้อมดึงข้อมูล Role ที่ผูกอยู่
        var user = await _context.Users
            .Include(u => u.Role) // ✅ เพื่อให้ดึง RoleName ได้
            .FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || user.PasswordHash != request.Password)
            return Unauthorized(new { message = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });

        if (user.IsActive == false)
            return Unauthorized(new { message = "บัญชีนี้ถูกระงับการใช้งาน" });

        // 2. ดึง Permissions 
        var permissions = new List<string>();
        try 
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            using (var cmd = conn.CreateCommand())
            {
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

        // 3. ✅ สร้าง Claims (ข้อมูลประจําตัว) เพื่อฝังลงใน Cookie Session
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "User")
        };
        
        foreach (var perm in permissions)
        {
            claims.Add(new Claim("Permission", perm));
        }

        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true, // ให้อยู่ได้แม้ปิดเบราว์เซอร์
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8) // อายุ 8 ชั่วโมง
        };

        // สั่งให้ระบบ Sign-in และสร้าง Cookie ตอบกลับไปที่ Browser 
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme, 
            new ClaimsPrincipal(claimsIdentity), 
            authProperties);

        // 4. ส่งข้อมูลกลับให้ Frontend (ไม่ต้องส่ง Token แล้ว)
        return Ok(new
        {
            message = "เข้าสู่ระบบสำเร็จ",
            User = new
            {
                user.UserId,
                user.Username,
                user.FirstName,
                user.LastName,
                user.RoleId,
                RoleName = user.Role?.RoleName ?? "ผู้ใช้งานทั่วไป", // ✅ ส่ง RoleName จริงไปให้หน้าเว็บโชว์
                user.WardId,
                Permissions = permissions 
            }
        });
    }

    // ==========================================
    // ✅ เพิ่มฟังก์ชัน LOGOUT เพื่อล้าง Cookie Session
    // ==========================================
    [HttpPost("Logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "ออกจากระบบสำเร็จ" });
    }

    // ==========================================
    // 2. ขอ OTP (ของเดิม)
    // ==========================================
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto model)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        if (user == null) return NotFound(new { message = "ไม่พบอีเมลนี้ในระบบ" });

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