using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations; // ✅ เพิ่มอันนี้เพื่อใช้ [Key]
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("requests")]
public partial class Request
{
    [Key] // ✅ ใส่ Key เพื่อความชัวร์
    [Column("request_id")]
    public int RequestId { get; set; }

    [Column("request_code")]
    public string? RequestCode { get; set; } 

    [Column("request_type")]
    public int RequestType { get; set; }

    [Column("requested_by_user_id")]
    public int RequestedByUserId { get; set; }

    [Column("target_ward_id")]
    public int TargetWardId { get; set; }

    [Column("current_status_id")]
    public int CurrentStatusId { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // --- Navigation Properties (ตัวเชื่อม) ---
    
    // ❌ เอา [JsonIgnore] ออก เพื่อให้ Frontend มองเห็นชื่อคนเบิก
    [ForeignKey("RequestedByUserId")]
    public virtual User? RequestedByUser { get; set; }

    // ❌ เอา [JsonIgnore] ออก เพื่อให้ Frontend มองเห็นชื่อวอร์ด
    [ForeignKey("TargetWardId")]
    public virtual Ward? TargetWard { get; set; }

    // ❌ เอา [JsonIgnore] ออก เพื่อให้ Frontend มองเห็นสถานะ
    [ForeignKey("CurrentStatusId")]
    public virtual RequestStatus? CurrentStatus { get; set; }

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}