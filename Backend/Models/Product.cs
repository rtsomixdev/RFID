using System;
using System.Collections.Generic;
using System.Text.Json.Serialization; 
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation; 

namespace Backend.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public string ProductCode { get; set; } = null!;

    public string ProductName { get; set; } = null!;

    public int CategoryId { get; set; }

    public string? SizeSpec { get; set; }

    public string? UnitName { get; set; }

    public decimal? StandardWeightKg { get; set; }

    // ✅ 1. เพิ่มตัวแปรเก็บ "สีของผ้า" (อนุญาตให้เป็นค่าว่างได้)
    public string? Color { get; set; }

    // ✅ 2. เพิ่มตัวแปรเช็ค "ผ้าใช้แล้วทิ้ง" (ค่าเริ่มต้นคือ false = ใช้ซ้ำและซักได้)
    public bool IsDisposable { get; set; } = false;

    public int MaxWashCount { get; set; } = 100;
    
    public int MaxLifespanDays { get; set; } = 365;

    public int? DefaultRoomId { get; set; }

    // ❌ ลบ MinStockLevel ออกไปแล้วครับ (เพราะเราใช้ Global Setting แทนแล้ว)

    [ValidateNever] 
    public virtual Category? Category { get; set; }

    public virtual Room? DefaultRoom { get; set; }

    public virtual ICollection<Linen> Linens { get; set; } = new List<Linen>();

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}