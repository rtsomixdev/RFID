using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    // DTO สำหรับรับข้อมูลจากหน้าเว็บ
    public class RoleDto
    {
        public string RoleName { get; set; } = null!;
        public List<int> PermissionIds { get; set; } = new List<int>(); // รับ ID ของสิทธิ์ที่ติ๊กเลือก
    }

    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public RoleController(LinenDbContext context)
        {
            _context = context;
        }

        // 1. GET: ดึง Role ทั้งหมดพร้อมสิทธิ์
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRoles()
        {
            var roles = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .OrderBy(r => r.RoleId)
                .ToListAsync();

            // แปลงข้อมูลให้อ่านง่ายสำหรับ Frontend
            var result = roles.Select(r => new
            {
                r.RoleId,
                r.RoleName,
                Permissions = r.RolePermissions.Select(rp => new 
                {
                    rp.PermissionId,
                    rp.Permission.PermissionCode,
                    rp.Permission.Description
                }).ToList()
            });

            return Ok(result);
        }

        // 2. GET: ดึง Master Permission ทั้งหมด (เอาไว้โชว์ให้เลือกติ๊ก)
        [HttpGet("Permissions")]
        public async Task<ActionResult<IEnumerable<Permission>>> GetAllPermissions()
        {
            return await _context.Permissions.OrderBy(p => p.PermissionId).ToListAsync();
        }

        // 3. GET: ดึง Role ตาม ID
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetRole(int id)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.RoleId == id);

            if (role == null) return NotFound();

            return new
            {
                role.RoleId,
                role.RoleName,
                PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList()
            };
        }

        // 4. POST: สร้าง Role ใหม่ พร้อมสิทธิ์
        [HttpPost]
        public async Task<ActionResult<Role>> CreateRole(RoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RoleName))
                return BadRequest("กรุณาระบุชื่อ Role");

            // 1. สร้าง Role
            var newRole = new Role { RoleName = dto.RoleName };
            _context.Roles.Add(newRole);
            await _context.SaveChangesAsync(); // Save เพื่อเอา RoleId

            // 2. บันทึกสิทธิ์ที่เลือก (ถ้ามี)
            if (dto.PermissionIds != null && dto.PermissionIds.Any())
            {
                var rolePermissions = dto.PermissionIds.Select(permId => new RolePermission
                {
                    RoleId = newRole.RoleId,
                    PermissionId = permId
                }).ToList();

                await _context.RolePermissions.AddRangeAsync(rolePermissions);
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetRole), new { id = newRole.RoleId }, newRole);
        }

        // 5. PUT: แก้ไข Role และสิทธิ์
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(int id, RoleDto dto)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.RoleId == id);

            if (role == null) return NotFound();

            // 1. แก้ชื่อ Role
            role.RoleName = dto.RoleName;

            // 2. แก้สิทธิ์ (ลบของเก่า -> ใส่ของใหม่)
            // ลบสิทธิ์เดิมทั้งหมดของ Role นี้
            _context.RolePermissions.RemoveRange(role.RolePermissions);
            
            // ใส่สิทธิ์ใหม่ที่ส่งมา
            if (dto.PermissionIds != null && dto.PermissionIds.Any())
            {
                var newPermissions = dto.PermissionIds.Select(permId => new RolePermission
                {
                    RoleId = id,
                    PermissionId = permId
                }).ToList();
                await _context.RolePermissions.AddRangeAsync(newPermissions);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "อัปเดต Role และสิทธิ์เรียบร้อยแล้ว" });
        }

        // 6. DELETE: ลบ Role
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return NotFound();

            // เช็คว่ามี User ใช้งานอยู่ไหม? (ถ้ามีห้ามลบ)
            var isInUse = await _context.Users.AnyAsync(u => u.RoleId == id);
            if (isInUse)
            {
                return BadRequest(new { message = "ไม่สามารถลบ Role นี้ได้ เนื่องจากมีผู้ใช้งานกำลังใช้งานอยู่" });
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}