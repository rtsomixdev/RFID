using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

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
    public int ProductId { get; set; }

    // ✅ Map ตัวแปร C# "Quantity" -> Database "quantity_requested"
    [Column("quantity_requested")]
    public int Quantity { get; set; }

    [Column("damage_reason_id")]
    public int? DamageReasonId { get; set; }

    // 👇👇 เพิ่มส่วนนี้เข้าไปครับ (เพื่อให้ Controller รู้จัก LinenId) 👇👇
    [Column("linen_id")]
    public int? LinenId { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---

    [ForeignKey("RequestId")]
    [JsonIgnore]
    public virtual Request? Request { get; set; }

    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("DamageReasonId")]
    public virtual DamageReason? DamageReason { get; set; }

    // 👇👇 เพิ่มตัวเชื่อม Linen ด้วย 👇👇
    [ForeignKey("LinenId")]
    public virtual Linen? Linen { get; set; }
}