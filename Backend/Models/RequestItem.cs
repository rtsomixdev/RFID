using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // ✅ ต้องมี
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("request_items")] // ✅ บังคับชื่อตาราง
public partial class RequestItem
{
    [Key]
    [Column("item_id")]
    public int ItemId { get; set; }

    [Column("request_id")]
    public int RequestId { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("quantity_requested")]
    public int QuantityRequested { get; set; }

    [Column("damage_reason_id")]
    public int? DamageReasonId { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---

    // ✅ สั่งให้ใช้ RequestId เชื่อมเท่านั้น
    [ForeignKey("RequestId")]
    [JsonIgnore]
    public virtual Request? Request { get; set; }

    // ✅✅✅ ตัวปัญหา (ProductId1)! เราสั่งมันตรงนี้เลยว่าให้ใช้ "ProductId"
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    // ✅ กันไว้ก่อนเผื่อมันงงกับ DamageReason ด้วย
    [ForeignKey("DamageReasonId")]
    public virtual DamageReason? DamageReason { get; set; }
}