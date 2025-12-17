using System;
using System.Collections.Generic;

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

    public int? DefaultRoomId { get; set; }

    public virtual Category Category { get; set; } = null!;

    public virtual Room? DefaultRoom { get; set; }

    public virtual ICollection<Linen> Linens { get; set; } = new List<Linen>();

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}
