using System;
using System.Collections.Generic;
// เพิ่มบรรทัดนี้สำหรับ [JsonIgnore] หรือ [ValidateNever] ถ้าจำเป็น
using System.Text.Json.Serialization; 
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation; 

namespace Backend.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public string ProductCode { get; set; } = null!;

    public string ProductName { get; set; } = null!;

    // ✅✅ 1. ตัวนี้ไม่มีเครื่องหมาย ? แปลว่า "บังคับต้องมี" (Logic ถูกต้องตามที่คุณต้องการ) ✅✅
    public int CategoryId { get; set; }

    public string? SizeSpec { get; set; }

    public string? UnitName { get; set; }

    public decimal? StandardWeightKg { get; set; }

    public int MaxWashCount { get; set; } = 100;
    
    public int MaxLifespanDays { get; set; } = 365;

    public int? DefaultRoomId { get; set; }

    // ✅✅ 2. ใส่ [ValidateNever] เพื่อบอกว่า "ตอนรับข้อมูลเข้า ไม่ต้องเช็คตัวนี้" (แก้ Error 400) ✅✅
    [ValidateNever] 
    public virtual Category? Category { get; set; }

    public virtual Room? DefaultRoom { get; set; }

    public virtual ICollection<Linen> Linens { get; set; } = new List<Linen>();

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}