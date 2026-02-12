using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;       // ✅ เพิ่มเพื่อใช้ [Key]
using System.ComponentModel.DataAnnotations.Schema; // ✅ เพิ่มเพื่อใช้ [Table], [Column]

namespace Backend.Models;

[Table("roles")] // ระบุชื่อตารางให้ตรงกับ SQL
public partial class Role
{
    [Key]
    [Column("role_id")] // ระบุชื่อคอลัมน์ให้ตรงเป๊ะ
    public int RoleId { get; set; }

    [Column("role_name")]
    public string RoleName { get; set; } = null!;

    // --- Navigation Properties ---

    // 1. ความสัมพันธ์เดิม (User)
    public virtual ICollection<User> Users { get; set; } = new List<User>();

    // 2. ✅ เพิ่มใหม่: ความสัมพันธ์กับ Permission (ผ่านตารางกลาง RolePermission)
    // เอาไว้ดึงว่า Role นี้มีสิทธิ์อะไรบ้าง
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}