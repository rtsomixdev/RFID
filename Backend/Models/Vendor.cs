using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Vendor
{
    public int VendorId { get; set; }

    public string VendorName { get; set; } = null!;

    public string? RegistrationNumber { get; set; }

    public virtual ICollection<Linen> Linens { get; set; } = new List<Linen>();
}
