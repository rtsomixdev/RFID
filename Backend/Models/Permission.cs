using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("permissions")]
public class Permission
{
    [Key]
    [Column("permission_id")]
    public int PermissionId { get; set; }

    [Column("permission_code")]
    [Required]
    public string PermissionCode { get; set; } = null!; // เช่น 'MANAGE_USER'

    [Column("description")]
    public string? Description { get; set; }
}