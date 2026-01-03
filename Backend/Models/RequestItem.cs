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

    // --- Navigation Properties (ตัวเชื่อม) ---

    [ForeignKey("RequestId")]
    [JsonIgnore]
    public virtual Request? Request { get; set; }

    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }

    [ForeignKey("DamageReasonId")]
    public virtual DamageReason? DamageReason { get; set; }
}