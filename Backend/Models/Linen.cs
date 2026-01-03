using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; 
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("linens")] 
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

    // ✅ เพิ่ม Status (เพื่อให้ Controller บันทึกว่า 'Available' หรือ 'Damaged' ได้)
    [Column("status")]
    public string? Status { get; set; }

    // ✅ เพิ่ม UpdatedAt (เพื่อบันทึกเวลาล่าสุดที่มีการแก้ไข)
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---
    
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("VendorId")]
    public virtual Vendor? Vendor { get; set; }

    [ForeignKey("HospitalId")]
    public virtual Hospital? Hospital { get; set; }
}