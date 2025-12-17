using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // ✅ ต้องมี
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("wards")] // ✅ บังคับชื่อตาราง
public partial class Ward
{
    [Key]
    [Column("ward_id")]
    public int WardId { get; set; }

    [Column("ward_name")]
    public string WardName { get; set; } = null!;

    [Column("hospital_id")]
    public int HospitalId { get; set; }

    [Column("is_active")]
    public bool? IsActive { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---

    // ✅ สั่งให้ใช้ HospitalId เชื่อมเท่านั้น
    [ForeignKey("HospitalId")]
    public virtual Hospital? Hospital { get; set; }
}