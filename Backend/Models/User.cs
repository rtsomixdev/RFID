using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    public string? PasswordHash { get; set; } // ✅ ใส่ ? ให้เป็น null ได้

    public int? TitleId { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public int? RoleId { get; set; }

    public int? HospitalId { get; set; }

    public int? WardId { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    // ✅ เพิ่ม 2 ตัวนี้เพื่อให้รับค่าจาก Database
    public string? OtpCode { get; set; }
    public DateTime? OtpExpiry { get; set; }
}