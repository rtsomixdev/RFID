using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Setting
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Key { get; set; } = string.Empty; // ชื่อค่า Config เช่น "MaxWashCount_BedSheet"

        [Required]
        public string Value { get; set; } = string.Empty; // ค่าที่กำหนด เช่น "100"

        public string Description { get; set; } = string.Empty; // คำอธิบาย เช่น "จำนวนครั้งซักสูงสุดของผ้าปูที่นอน"
    }
}