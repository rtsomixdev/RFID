using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("system_logs")]
public class SystemLog
{
    [Key]
    [Column("log_id")]
    public int LogId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("action_type")]
    public string ActionType { get; set; } = null!; // LOGIN, ADD, UPDATE, DELETE

    [Column("description")]
    public string? Description { get; set; } // รายละเอียด เช่น "เพิ่มผ้า RFID: E200..."

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}