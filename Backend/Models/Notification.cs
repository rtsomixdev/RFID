using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("notifications")] // ตั้งชื่อตารางใน DB เป็นตัวเล็ก (Good Practice)
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        // ระบุตัวบุคคล (ถ้าเป็น null แปลว่าเป็นประกาศกลุ่ม)
        public int? UserId { get; set; }

        // ระบุกลุ่มเป้าหมาย (ถ้าเป็น null แปลว่าเป็นส่วนตัว)
        // 1=Admin, 2=Head, 3=Staff
        public int? RoleId { get; set; } 

        [Required]
        public string Title { get; set; } = string.Empty; // หัวข้อ

        public string Message { get; set; } = string.Empty; // เนื้อหา

        public string Type { get; set; } = "INFO"; // INFO, SUCCESS, WARNING, DANGER

        public bool IsRead { get; set; } = false; // อ่านยัง?

        public string? LinkUrl { get; set; } // เผื่อกดแล้วเด้งไปหน้านั้น (เช่น /requests)

        // หมายเหตุ: การบวกเวลาใน Model แบบนี้สะดวกดีแต่อาจมีปัญหาถ้า Server ย้าย Timezone 
        // แต่ถ้าใช้ในไทยตลอดก็โอเคครับ
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(7);
    }
}