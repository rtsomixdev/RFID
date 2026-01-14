using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("linen_logs")]
public partial class LinenLog
{
    [Key]
    [Column("log_id")]
    public int LogId { get; set; }

    [Column("linen_id")]
    public int LinenId { get; set; }

    [Column("reader_id")]
    public int? ReaderId { get; set; }

    [Column("room_id")]
    public int? RoomId { get; set; }

    [Column("activity_type")]
    public string? ActivityType { get; set; }

    // ✅ เพิ่มตัวนี้ครับ (สถานะหลังจากสแกน) - แก้ Error: LinenLog does not contain 'StatusAfter'
    [Column("status_after")]
    public string? StatusAfter { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    // ✅ เพิ่มตัวนี้ครับ (เวลาที่เกิด Log) - แก้ Error: LinenLog does not contain 'CreatedAt'
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // เก็บตัวนี้ไว้ด้วยเผื่อโค้ดเก่าใช้ (Map ให้มันชี้ไปที่ CreatedAt หรือเก็บแยกก็ได้ แต่เพื่อให้ผ่าน Error แนะนำให้มี CreatedAt หลักๆ)
    [Column("timestamp")]
    public DateTime? Timestamp { get; set; }

    // --- Navigation Properties ---

    [ForeignKey("LinenId")]
    public virtual Linen? Linen { get; set; }

    [ForeignKey("ReaderId")]
    public virtual Reader? Reader { get; set; }

    [ForeignKey("RoomId")]
    public virtual Room? Room { get; set; }
}