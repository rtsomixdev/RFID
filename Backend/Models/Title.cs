using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Title
{
    public int TitleId { get; set; }

    public string TitleNameTh { get; set; } = null!;

    public string? TitleNameEn { get; set; }

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
