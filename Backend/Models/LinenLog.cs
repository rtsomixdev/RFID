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
    public string? ActivityType { get; set; } // เช่น "Add", "Wash", "Move", "Discard"

    [Column("status_after")]
    public string? StatusAfter { get; set; } // สถานะของผ้าหลังจากทำรายการนี้

    [Column("description")]
    public string? Description { get; set; }

    // ✅ เพิ่มใหม่: เพื่อใช้ทำรายงาน Flow (จากจุด A -> ไปจุด B)
    [Column("from_location")]
    public string? FromLocation { get; set; }

    [Column("to_location")]
    public string? ToLocation { get; set; }

    // ✅ เวลาที่เกิด Log (ใช้ CreatedAt เป็นหลักเพื่อความชัดเจน)
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7); // ใช้เวลาไทย

    // เก็บ Timestamp ไว้เพื่อให้รองรับ Code เก่า (Map ไปหา CreatedAt ก็ได้ หรือแยกก็ได้)
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