using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมข้อมูลและจัดการสิทธิ์บทบาทหน้าที่ภายในระบบ
    /// </summary>
    public class RoleService : IRoleService
    {
        private readonly LinenDbContext _context;

        public RoleService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการบรรดาบุคลากรและสิทธิการเข้าถึงของแต่ละตำแหน่งหน้าที่
        /// </summary>
        /// <returns>ชุดข้อมูลของตำแหน่งและขอบเขตสิทธิ์</returns>
        public async Task<IEnumerable<object>> GetRolesAsync()
        {
            var roles = await _context.Roles
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .OrderBy(r => r.RoleId)
                .ToListAsync();

            return roles.Select(r => new
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
        }

        /// <summary>
        /// รวบรวมสิทธิ์การตัดสินใจและทำงานภายในฟังก์ชันระบบพื้นฐานทั้งหมด
        /// </summary>
        /// <returns>รายการประเภทของสิทธิการทำงาน</returns>
        public async Task<IEnumerable<Permission>> GetAllPermissionsAsync()
        {
            return await _context.Permissions.OrderBy(p => p.PermissionId).ToListAsync();
        }

        /// <summary>
        /// ค้นหารายละเอียดของบทบาทนั้น ๆ เจาะจงรายไอดี
        /// </summary>
        /// <param name="id">รหัสหน้าประจำตำแหน่ง</param>
        /// <returns>สิทธิ์การเข้าถึงแบบละเอียดของหน้านั้น</returns>
        public async Task<object?> GetRoleAsync(int id)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.RoleId == id);

            if (role == null) return null;

            return new
            {
                role.RoleId,
                role.RoleName,
                PermissionIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList()
            };
        }

        /// <summary>
        /// เพิ่มตำแหน่งงานบทบาทหน้าที่ใหม่เข้าสู่ผังควบคุมสิทธิ์
        /// </summary>
        /// <param name="dto">แบบแปลนรายชื่อสิทธิประโยชน์</param>
        /// <returns>สร้างตำแหน่งพร้อมข้อมูลสิทธิ์ที่ติดมาสำเร็จ</returns>
        public async Task<(int Status, string? Message, Role? Item)> CreateRoleAsync(RoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RoleName))
                return (400, "กรุณาระบุชื่อ Role", null);

            var newRole = new Role { RoleName = dto.RoleName };
            _context.Roles.Add(newRole);
            await _context.SaveChangesAsync(); 

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

            return (201, null, newRole);
        }

        /// <summary>
        /// ปรับปรุงรายละเอียดตำแหน่งหรือโยกย้ายสิทธิใหม่
        /// </summary>
        /// <param name="id">รหัสของตำแหน่งพนักงาน</param>
        /// <param name="dto">รูปแบบการแก้ไข</param>
        /// <returns>สถานะลบล้างและเพิ่มสิทธิเสร็จสิ้น</returns>
        public async Task<(int Status, string? Message)> UpdateRoleAsync(int id, RoleDto dto)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.RoleId == id);

            if (role == null) return (404, "ไม่พบ Role");

            role.RoleName = dto.RoleName;

            _context.RolePermissions.RemoveRange(role.RolePermissions);
            
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

            return (200, "อัปเดต Role และสิทธิ์เรียบร้อยแล้ว");
        }

        /// <summary>
        /// ถอนตำแหน่งออกจากระบบโดยตรวจสอบเงื่อนไขความเกี่ยวโยงผู้ใช้งาน
        /// </summary>
        /// <param name="id">รหัสบทบาทหน้า</param>
        /// <returns>ความสำเร็จถ้าตำแหน่งนี้ไม่มีพนักงานถือครอง</returns>
        public async Task<(int Status, string? Message)> DeleteRoleAsync(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return (404, null);

            var isInUse = await _context.Users.AnyAsync(u => u.RoleId == id);
            if (isInUse)
            {
                return (400, "ไม่สามารถลบ Role นี้ได้ เนื่องจากมีผู้ใช้งานกำลังใช้งานอยู่");
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return (204, null);
        }
    }
}
