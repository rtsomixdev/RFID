using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; 
using System.Text.Json.Serialization;

namespace Backend.Models;

// ✅ Enum นี้ดีแล้วครับ เก็บไว้ใช้กับ Controller ได้เลย
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
    public int? VendorId { get; set; }

    [Column("hospital_id")]
    public int HospitalId { get; set; }

    [Column("registered_at")]
    public DateTime RegisteredAt { get; set; } = DateTime.Now;

    // ---------------------------------------------------------
    // ⭐ ส่วนที่รองรับระบบซักรีด (Laundry) ⭐
    // ---------------------------------------------------------

    [Column("status")]
    public string Status { get; set; } = "Available"; 

    // จำนวนรอบการซักปัจจุบัน
    [Column("wash_count")]
    public int WashCount { get; set; } = 0;

    // วันที่ส่งซักล่าสุด
    [Column("last_wash_date")]
    public DateTime? LastWashDate { get; set; }

    // ---------------------------------------------------------
    // ⭐ ส่วนที่เพิ่มใหม่ตาม Requirement อาจารย์ ⭐
    // ---------------------------------------------------------

    // [New] เกณฑ์หมดอายุของผ้าชิ้นนี้ (เช่น 50 ครั้ง, 100 ครั้ง)
    // ระบบจะเช็คว่าถ้า WashCount >= MaxWashCount ให้แจ้งเตือนหมดอายุ
    [Column("max_wash_count")]
    public int MaxWashCount { get; set; } = 100; 

    // [New] สถานที่ปัจจุบัน (เอาไว้บอกว่าผ้าอยู่ที่ไหน เช่น "Stock", "Ward 3", "Laundry")
    [Column("current_location")]
    public string CurrentLocation { get; set; } = "Stock";

    // ---------------------------------------------------------

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true; // true=ปกติ, false=จำหน่ายออก/ชำรุด

    // --- Navigation Properties ---
    
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("VendorId")]
    public virtual Vendor? Vendor { get; set; }

    [ForeignKey("HospitalId")]
    public virtual Hospital? Hospital { get; set; }
}