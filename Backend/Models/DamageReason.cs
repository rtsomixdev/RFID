using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class DamageReason
{
    public int ReasonId { get; set; }

    public string ReasonName { get; set; } = null!;

    public virtual ICollection<RequestItem> RequestItems { get; set; } = new List<RequestItem>();
}
