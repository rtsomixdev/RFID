using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Data; 
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Controllers;

/// <summary>
/// ข้อมูลสำหรับการเข้าสู่ระบบ
/// </summary>
public class LoginDto
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}

/// <summary>
/// ข้อมูลสำหรับการขอรหัส OTP เพื่อรีเซ็ตหน้าจอหรือรหัสผ่าน
/// </summary>
public class RequestOtpDto { public string Email { get; set; } = null!; }

/// <summary>
/// ข้อมูลสำหรับการยืนยันความถูกต้องของรหัส OTP
/// </summary>
public class VerifyOtpDto { public string Email { get; set; } = null!; public string Otp { get; set; } = null!; }

/// <summary>
/// ข้อมูลสำหรับการตั้งรหัสผ่านใหม่
/// </summary>
public class ResetPasswordDto { public string Email { get; set; } = null!; public string Otp { get; set; } = null!; public string NewPassword { get; set; } = null!; }

/// <summary>
/// ควบคุมการทำงานด้านการยืนยันตัวตน การเข้าสู่ระบบ และการจัดการเซสชันของผู้ใช้งาน
/// </summary>
[Route("api/[controller]")]
[ApiController]
[EnableRateLimiting("GlobalSpam")]
public class AuthController : ControllerBase
{
    private readonly Services.IAuthService _service;

    /// <summary>
    /// กำหนดค่าเริ่มต้นให้กับ AuthController
    /// </summary>
    /// <param name="service">บริการสำหรับการจัดการการยืนยันตัวตน</param>
    public AuthController(Services.IAuthService service)
    {
        _service = service;
    }

    /// <summary>
    /// ตรวจสอบการเข้าสู่ระบบและสร้างเซสชันคุกกี้สำหรับผู้ใช้งาน พร้อมทั้งระบุสิทธิ์การใช้งานเบื้องต้น
    /// </summary>
    /// <param name="request">ข้อมูลผู้ใช้งานและรหัสผ่าน</param>
    /// <returns>ผลลัพธ์การเข้าสู่ระบบพร้อมข้อมูลเบื้องต้นของผู้ใช้งานและการอนุญาตสิทธิ์</returns>
    [HttpPost("Login")]
    [EnableRateLimiting("StrictLogin")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var result = await _service.LoginAsync(request);

        if (result.Status == 401) return Unauthorized(new { message = result.Message });
        if (result.Status == 500) return StatusCode(500, new { message = result.Message });

        var user = result.User!;
        var permissions = result.Permissions!;

        // รวบรวมข้อมูลระบุตัวตนและบทบาทเพื่อนำไปสร้างสิทธิ์การเข้าถึงในระบบนิเวศ
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
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
        };

        // เริ่มต้นเซสชันคุกกี้เพื่อรักษาการเข้าสู่ระบบไว้ชั่วคราวตามระยะเวลาที่กำหนด
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme, 
            new ClaimsPrincipal(claimsIdentity), 
            authProperties);

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
                RoleName = user.Role?.RoleName ?? "ผู้ใช้งานทั่วไป",
                user.WardId,
                Permissions = permissions 
            }
        });
    }

    /// <summary>
    /// ยกเลิกเซสชันและออกจากระบบ
    /// </summary>
    /// <returns>ผลลัพธ์การออกจากระบบและล้างเซสชันสำเร็จ</returns>
    [HttpPost("Logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "ออกจากระบบสำเร็จ" });
    }

    /// <summary>
    /// ขอรหัส OTP สำหรับการกู้คืนรหัสผ่าน
    /// </summary>
    /// <param name="model">อีเมลของผู้ใช้งาน</param>
    /// <returns>ผลลัพธ์การส่งรหัส OTP ไปยังอีเมล</returns>
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto model)
    {
        var result = await _service.RequestOtpAsync(model);
        if (result.Status == 404) return NotFound(new { message = result.Message });
        if (result.Status == 500) return StatusCode(500, new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// ตรวจสอบความถูกต้องของรหัส OTP ก่อนดำเนินการในขั้นตอนถัดไป
    /// </summary>
    /// <param name="model">อีเมลและรหัส OTP ที่ได้รับ</param>
    /// <returns>ผลลัพธ์การตรวจสอบความถูกต้อง</returns>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto model)
    {
        var result = await _service.VerifyOtpAsync(model);
        if (result.Status == 400) return BadRequest(new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// ตั้งรหัสผ่านใหม่หลังจากยืนยันตัวตนด้วยรหัส OTP สำเร็จ
    /// </summary>
    /// <param name="model">ข้อมูลการตั้งรหัสผ่านใหม่ที่ประกอบด้วยรหัสผ่านใหม่และรหัส OTP เดิม</param>
    /// <returns>ผลลัพธ์การเปลี่ยนรหัสผ่าน</returns>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
    {
        var result = await _service.ResetPasswordAsync(model);
        if (result.Status == 400) return BadRequest(new { message = result.Message });
        
        return Ok(new { message = result.Message });
    }
}