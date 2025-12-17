using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Room
{
    public int RoomId { get; set; }

    public string RoomName { get; set; } = null!;

    public int WardId { get; set; }

    public virtual ICollection<LinenLog> LinenLogs { get; set; } = new List<LinenLog>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual ICollection<Reader> Readers { get; set; } = new List<Reader>();

    public virtual Ward Ward { get; set; } = null!;
}
