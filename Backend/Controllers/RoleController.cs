using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลบทบาทและสิทธิ์ที่ส่งมาจากส่วนหน้าเว็บ
    /// </summary>
    public class RoleDto
    {
        public string RoleName { get; set; } = null!;
        public List<int> PermissionIds { get; set; } = new List<int>(); 
    }

    /// <summary>
    /// ควบคุมการจัดการบทบาทหน้าที่ผู้ใช้งาน (Role) และสิทธิการดำเนินงาน (Permissions)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly Services.IRoleService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ RoleController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการระดับสิทธิ์</param>
        public RoleController(Services.IRoleService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงรายการบทบาทและการตั้งค่าสิทธิทั้งหมด
        /// </summary>
        /// <returns>รายชื่อและโครงสร้างของสิทธิการดำเนินงาน</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRoles()
        {
            return Ok(await _service.GetRolesAsync());
        }

        /// <summary>
        /// ดึงรายการสิทธิพื้นฐานทั้งหมดสำหรับการผูกเข้ากับบทบาท
        /// </summary>
        /// <returns>รายการของสิทธิ์ที่มีให้เลือก</returns>
        [HttpGet("Permissions")]
        public async Task<ActionResult<IEnumerable<Permission>>> GetAllPermissions()
        {
            return Ok(await _service.GetAllPermissionsAsync());
        }

        /// <summary>
        /// ค้นหาสิทธิและบทบาทตามรหัสบทบาท
        /// </summary>
        /// <param name="id">รหัสบทบาท (Role ID)</param>
        /// <returns>ข้อมูลของบทบาทนั้นๆ</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetRole(int id)
        {
            var role = await _service.GetRoleAsync(id);
            if (role == null) return NotFound();
            return Ok(role);
        }

        /// <summary>
        /// สร้างบทบาทใหม่ระบบพร้อมการจัดตั้งสิทธิที่ระบุ
        /// </summary>
        /// <param name="dto">ข้อมูลกำหนดของบทบาทหน้าใหม่</param>
        /// <returns>ข้อมูลการสร้างระดับสิทธิสำเร็จ</returns>
        [HttpPost]
        public async Task<ActionResult<Role>> CreateRole(RoleDto dto)
        {
            var result = await _service.CreateRoleAsync(dto);
            if (result.Status == 400) return BadRequest(result.Message);
            return CreatedAtAction(nameof(GetRole), new { id = result.Item?.RoleId }, result.Item);
        }

        /// <summary>
        /// เปลี่ยนแปลงชื่อและสิทธิการเข้าถึงของบทบาทที่เกี่ยวข้อง
        /// </summary>
        /// <param name="id">หมายเลขบทบาทเดิม</param>
        /// <param name="dto">ข้อมูลบทบาทที่จะทับ</param>
        /// <returns>สถานะสะท้อนผลการปรับข้อมูล</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(int id, RoleDto dto)
        {
            var result = await _service.UpdateRoleAsync(id, dto);
            if (result.Status == 404) return NotFound();
            return Ok(new { message = result.Message });
        }

        /// <summary>
        /// ลบบทบาทระบบออก
        /// </summary>
        /// <param name="id">รหัสบทบาท</param>
        /// <returns>ผลสัมฤทธิ์แสดงความสำเร็จของระบบ</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var result = await _service.DeleteRoleAsync(id);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            if (result.Status == 404) return NotFound();
            return NoContent();
        }
    }
}