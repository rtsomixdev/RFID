using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("special_tags")]
    public class SpecialTag
    {
        [Key]
        [Column("tag_id")]
        // ✅ เติม = string.Empty; เพื่อบอกว่าค่าเริ่มต้นคือ "ว่าง" (ห้ามเป็น Null)
        public string TagId { get; set; } = string.Empty; 
        
        [Required]
        [Column("command_type")]
        // ✅ เติม = string.Empty;
        public string CommandType { get; set; } = string.Empty; 
        
        [Column("target_status")]
        public string? TargetStatus { get; set; } // เป็น Nullable (?) อยู่แล้ว ไม่ต้องแก้
        
        [Column("description")]
        public string? Description { get; set; } // เป็น Nullable (?) อยู่แล้ว ไม่ต้องแก้
        
        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}