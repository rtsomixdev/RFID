using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;       // 👈 1. ต้องมีบรรทัดนี้
using System.ComponentModel.DataAnnotations.Schema; // 👈 2. ต้องมีบรรทัดนี้

namespace Backend.Models;

public partial class Room
{
    [Column("room_id")] // (แนะนำให้ใส่ให้ครบทุกอันเพื่อความชัวร์)
    public int RoomId { get; set; }

    [Column("room_name")]
    public string RoomName { get; set; } = null!;

    // ✅✅✅ แก้ตรงนี้: ระบุชื่อคอลัมน์ใน DB ให้ชัดเจนว่าเป็นตัวเล็ก
    [Column("description")] 
    public string? Description { get; set; }

    [Column("ward_id")]
    public int? WardId { get; set; } 

    // --- Navigation Properties ---
    public virtual ICollection<LinenLog> LinenLogs { get; set; } = new List<LinenLog>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual ICollection<Reader> Readers { get; set; } = new List<Reader>();

    public virtual Ward? Ward { get; set; } 
}