using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Hospital
{
    public int HospitalId { get; set; }

    public string HospitalName { get; set; } = null!;

    public string? Address { get; set; }

    public string? ContactInfo { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Linen> Linens { get; set; } = new List<Linen>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();

    public virtual ICollection<Ward> Wards { get; set; } = new List<Ward>();
}
