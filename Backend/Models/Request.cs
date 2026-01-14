using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("requests")]
public partial class Request
{
    [Key]
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

    // ✅ เพิ่มตัวนี้ครับ (Status Text) - แก้ Error: Request does not contain 'Status'
    [Column("status")]
    public string? Status { get; set; } 

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; } = DateTime.Now;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // เวลาที่ออกจากต้นทาง (เริ่มขนส่ง)
    [Column("dispatch_date")]
    public DateTime? DispatchDate { get; set; }

    // เวลาที่ถึงปลายทาง (ส่งสำเร็จ)
    [Column("arrival_date")]
    public DateTime? ArrivalDate { get; set; }

    // หมายเหตุเพิ่มเติม
    [Column("note")]
    public string? Note { get; set; }

    // --- Navigation Properties ---
    
    [ForeignKey("RequestedByUserId")]
    public virtual User? RequestedByUser { get; set; }

    [ForeignKey("TargetWardId")]
    public virtual Ward? TargetWard { get; set; }

    [ForeignKey("CurrentStatusId")]
    public virtual RequestStatus? CurrentStatus { get; set; }

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}