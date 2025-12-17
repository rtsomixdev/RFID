using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema; // ✅ ต้องมีบรรทัดนี้!
using System.Text.Json.Serialization; 

namespace Backend.Models;

[Table("requests")] // ✅ บังคับชื่อตารางตรงนี้เลย
public partial class Request
{
    [Column("request_id")] // ✅ บังคับชื่อคอลัมน์
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
    
    // ✅ สั่งห้ามสร้างคอลัมน์ผี! ให้ใช้ RequestedByUserId เชื่อมเท่านั้น
    [ForeignKey("RequestedByUserId")]
    [JsonIgnore] 
    public virtual User? RequestedByUser { get; set; }

    // ✅ สั่งให้ใช้ TargetWardId เชื่อมเท่านั้น
    [ForeignKey("TargetWardId")]
    [JsonIgnore]
    public virtual Ward? TargetWard { get; set; }

    // ✅✅✅ ตัวปัญหาที่ทำให้ Error! สั่งให้ใช้ CurrentStatusId เชื่อมเท่านั้น
    [ForeignKey("CurrentStatusId")]
    [JsonIgnore]
    public virtual RequestStatus? CurrentStatus { get; set; }

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}