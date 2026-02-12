using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; // ✅ จำเป็นต้องมีเพื่อใช้ JsonPropertyName

namespace Backend.Models;

[Table("request_items")]
public partial class RequestItem
{
    [Key]
    [Column("item_id")]
    public int ItemId { get; set; }

    [Column("request_id")]
    public int RequestId { get; set; }

    [Column("product_id")]
    [JsonPropertyName("product_id")] // ✅ ดักจับค่า product_id จาก Frontend
    public int ProductId { get; set; }

    // 🔥 ส่วนสำคัญ: แก้ปัญหาเลข 0 โดยการ Map ค่า 'quantity' จากหน้าเว็บ
    // เข้าสู่คอลัมน์ 'quantity_requested' ในฐานข้อมูล
    [Column("quantity_requested")]
    [JsonPropertyName("quantity")] // ✅ หน้าเว็บส่ง "quantity" มา Backend จะรับเข้าตัวนี้ทันที
    public int QuantityRequested { get; set; }

    [Column("damage_reason_id")]
    [JsonPropertyName("damage_reason_id")]
    public int? DamageReasonId { get; set; }

    // --- Navigation Properties (ตัวเชื่อมความสัมพันธ์) ---

    [ForeignKey("RequestId")]
    [JsonIgnore]
    public virtual Request? Request { get; set; }

    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("DamageReasonId")]
    public virtual DamageReason? DamageReason { get; set; }
}