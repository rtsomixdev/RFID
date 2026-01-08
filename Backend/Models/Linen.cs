using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; 
using System.Text.Json.Serialization;

namespace Backend.Models;

// ✅ แนะนำให้สร้าง Enum ไว้ใช้คุม Status ใน Controller (วางไว้ข้างบน หรือแยกไฟล์ก็ได้)
public enum LinenStatus 
{
    Available,      // พร้อมใช้
    InUse,          // ถูกเบิกไปใช้
    SendingWash,    // กำลังส่งซัก (Scan ขาออก)
    Washing,        // อยู่ที่ร้านซัก
    ReturnClean,    // รับกลับมาแล้ว (รอจัดเก็บ)
    Damaged,        // ชำรุด
    Lost            // สูญหาย
}

[Table("linens")] 
public partial class Linen
{
    [Key]
    [Column("linen_id")]
    public int LinenId { get; set; }

    [Column("rfid_code")]
    [Required]
    [StringLength(50)]
    public string RfidCode { get; set; } = null!;

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("vendor_id")]
    public int? VendorId { get; set; } // เจ้าของผ้า หรือ ผู้ผลิต

    [Column("hospital_id")]
    public int HospitalId { get; set; }

    [Column("registered_at")]
    public DateTime RegisteredAt { get; set; } = DateTime.Now;

    // ---------------------------------------------------------
    // ⭐ ส่วนที่เพิ่มใหม่เพื่อรองรับระบบซักรีด (Laundry) ⭐
    // ---------------------------------------------------------

    // สถานะปัจจุบัน (เก็บเป็น String เพื่อให้อ่านใน DB ง่าย หรือจะเก็บเป็น Int ก็ได้)
    // Values: "Available", "Washing", "Damaged", etc.
    [Column("status")]
    public string Status { get; set; } = "Available"; 

    // จำนวนรอบการซัก (Wash Cycle) -> บวกเพิ่มทุกครั้งที่รับผ้ากลับ
    [Column("wash_count")]
    public int WashCount { get; set; } = 0;

    // วันที่ส่งซักล่าสุด
    [Column("last_wash_date")]
    public DateTime? LastWashDate { get; set; }

    // ---------------------------------------------------------

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // --- Navigation Properties ---
    
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("VendorId")]
    public virtual Vendor? Vendor { get; set; }

    [ForeignKey("HospitalId")]
    public virtual Hospital? Hospital { get; set; }
}