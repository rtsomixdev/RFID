using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // ✅ ต้องมี
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("linen_logs")] // ✅ บังคับชื่อตาราง
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

    [Column("timestamp")]
    public DateTime? Timestamp { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---

    // ✅ สั่งให้ใช้ LinenId เชื่อมเท่านั้น
    [ForeignKey("LinenId")]
    public virtual Linen? Linen { get; set; }

    // ✅ สั่งให้ใช้ ReaderId
    [ForeignKey("ReaderId")]
    public virtual Reader? Reader { get; set; }

    // ✅ สั่งให้ใช้ RoomId
    [ForeignKey("RoomId")]
    public virtual Room? Room { get; set; }
}