using System;
using System.Collections.Generic;

namespace Backend.Models;

public partial class Reader
{
    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = null!;

    public string IpAddress { get; set; } = null!;

    public string? ReaderType { get; set; }

    public int? InstalledAtRoomId { get; set; }

    public string? OperatingDays { get; set; }

    public TimeOnly? OperatingStartTime { get; set; }

    public TimeOnly? OperatingEndTime { get; set; }

    public bool? IsActive { get; set; }

    public virtual Room? InstalledAtRoom { get; set; }

    public virtual ICollection<LinenLog> LinenLogs { get; set; } = new List<LinenLog>();
}
