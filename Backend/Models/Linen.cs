using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // ✅ ต้องมี
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("linens")] // ✅ บังคับชื่อตาราง
public partial class Linen
{
    [Key]
    [Column("linen_id")]
    public int LinenId { get; set; }

    [Column("rfid_code")]
    public string RfidCode { get; set; } = null!;

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("vendor_id")]
    public int? VendorId { get; set; }

    [Column("hospital_id")]
    public int HospitalId { get; set; }

    [Column("registered_at")]
    public DateTime RegisteredAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---
    
    // ✅ สั่งให้ใช้ ProductId เชื่อมเท่านั้น
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    // ✅ สั่งให้ใช้ VendorId เชื่อมเท่านั้น
    [ForeignKey("VendorId")]
    public virtual Vendor? Vendor { get; set; }

    // ✅ สั่งให้ใช้ HospitalId เชื่อมเท่านั้น
    [ForeignKey("HospitalId")]
    public virtual Hospital? Hospital { get; set; }
}