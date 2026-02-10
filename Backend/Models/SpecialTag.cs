using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("special_tags")]
    public class SpecialTag
    {
        [Key]
        [Column("tag_id")]
        public string TagId { get; set; } // รหัส RFID (เช่น "CMD001")
        
        [Required]
        [Column("command_type")]
        public string CommandType { get; set; } // คำสั่ง เช่น "SET_MODE_WASH"
        
        [Column("target_status")]
        public string? TargetStatus { get; set; } // สถานะที่จะเปลี่ยนให้ผ้า
        
        [Column("description")]
        public string? Description { get; set; }
        
        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}