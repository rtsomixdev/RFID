using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("readers")]
public partial class Reader
{
    [Key]
    [Column("reader_id")]
    public int ReaderId { get; set; }

    [Column("reader_name")]
    [Required]
    public string ReaderName { get; set; } = null!;

    [Column("ip_address")]
    [Required]
    public string IpAddress { get; set; } = null!;

    [Column("reader_type")]
    public string? ReaderType { get; set; } 

    // หน้าที่หลักของเครื่อง (Static Function) - ค่าตั้งต้น
    [Column("reader_function")]
    public string ReaderFunction { get; set; } = "CHECK";

    // ✅ เพิ่มใหม่: โหมดการทำงานปัจจุบัน (Dynamic Mode)
    [Column("current_mode")]
    public string CurrentMode { get; set; } = "Normal";

    // ✅ Location (Display Name)
    [Column("location")]
    public string? Location { get; set; }

    // ✅ Fixed Location ID (ใช้ field นี้ผูกกับ Room จริง)
    [Column("installed_at_room_id")]
    public int? InstalledAtRoomId { get; set; }

    // ✅✅✅ เพิ่มตัวนี้ครับ: แก้ Error "Reader does not contain definition for RoomId"
    // (เพราะใน LinenDbContext มีการ map field นี้อยู่)
    [Column("room_id")]
    public int? RoomId { get; set; }

    [Column("operating_days")]
    public string? OperatingDays { get; set; }

    [Column("operating_start_time")]
    public TimeOnly? OperatingStartTime { get; set; }

    [Column("operating_end_time")]
    public TimeOnly? OperatingEndTime { get; set; }

    [Column("is_active")]
    public bool? IsActive { get; set; }

    // ✅ เพิ่ม UpdatedAt สำหรับระบบ Monitor Offline
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // --- Navigation Properties ---

    [ForeignKey("InstalledAtRoomId")]
    public virtual Room? InstalledAtRoom { get; set; }

    // (Optional) ถ้าต้องการผูก RoomId ด้วยในอนาคต
    // [ForeignKey("RoomId")]
    // public virtual Room? Room { get; set; }

    public virtual ICollection<LinenLog> LinenLogs { get; set; } = new List<LinenLog>();
}