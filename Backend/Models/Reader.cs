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

    // หน้าที่ของเครื่องนี้ (REGISTRATION, DISPATCH, RECEIVE, CHECK)
    [Column("reader_function")]
    public string ReaderFunction { get; set; } = "CHECK";

    // ✅ เพิ่มตัวนี้ครับ (Location) - แก้ Error: Reader does not contain definition for 'Location'
    [Column("location")]
    public string? Location { get; set; }

    [Column("installed_at_room_id")]
    public int? InstalledAtRoomId { get; set; }

    [Column("operating_days")]
    public string? OperatingDays { get; set; }

    [Column("operating_start_time")]
    public TimeOnly? OperatingStartTime { get; set; }

    [Column("operating_end_time")]
    public TimeOnly? OperatingEndTime { get; set; }

    [Column("is_active")]
    public bool? IsActive { get; set; }

    // --- Navigation Properties ---

    [ForeignKey("InstalledAtRoomId")]
    public virtual Room? InstalledAtRoom { get; set; }

    public virtual ICollection<LinenLog> LinenLogs { get; set; } = new List<LinenLog>();
}