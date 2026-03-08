using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

/// <summary>
/// ควบคุมและบริหารผู้ใช้งานระบบ
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly Services.IUserService _service;

    /// <summary>
    /// กำหนดค่าเริ่มต้นให้กับ UserController
    /// </summary>
    /// <param name="service">บริการสำหรับการจัดการผู้ใช้งาน</param>
    public UserController(Services.IUserService service)
    {
        _service = service;
    }

    /// <summary>
    /// ดึงรายการผู้ใช้ทั้งหมด
    /// </summary>
    /// <returns>ข้อมูลผู้ใช้งานทั้งหมดในระบบ</returns>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return Ok(await _service.GetUsersAsync());
    }

    /// <summary>
    /// ดึงข้อมูลค้นหาผู้ใช้งานจากรหัสชี้วัด
    /// </summary>
    /// <param name="id">รหัสผู้ใช้งาน</param>
    /// <returns>รายละเอียดของผู้ใช้งาน</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await _service.GetUserAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    /// <summary>
    /// อัปเดตข้อมูลรายละเอียดของผู้ใช้ระบบ
    /// </summary>
    /// <param name="id">รหัสผู้ใช้งาน</param>
    /// <param name="user">ข้อมูลใหม่ที่ต้องการแก้ไข</param>
    /// <returns>รายงานผลจากการเปลี่ยนแปลงสถานะผู้ใช้งาน</returns>
    [HttpPut("{id}")]
    public async Task<IActionResult> PutUser(int id, User user)
    {
        var result = await _service.PutUserAsync(id, user);
        
        if (result.Status == 400) return BadRequest(new { message = result.Message });
        if (result.Status == 404) return NotFound(new { message = result.Message });
        if (result.Status == 500) return StatusCode(500, new { message = result.Message });

        return NoContent();
    }

    /// <summary>
    /// สร้างตัวผู้ใช้และบันทึกผู้ใช้ระบบใหม่
    /// </summary>
    /// <param name="user">ข้อมูลผู้ใช้ที่จะสร้าง</param>
    /// <returns>สถานะผลสรุปเพิ่มผู้ใช้พร้อมไอดี</returns>
    [HttpPost]
    public async Task<ActionResult<User>> PostUser(User user)
    {
        var result = await _service.PostUserAsync(user);
        if (result.Status == 500) return StatusCode(500, new { message = result.Message });
        return CreatedAtAction("GetUser", new { id = result.Item?.UserId }, result.Item);
    }

    /// <summary>
    /// ลบข้อมูลผู้ใช้ออกจากฐานหลัก
    /// </summary>
    /// <param name="id">รหัสผู้ใช้งาน</param>
    /// <returns>การยืนยันสถานะที่ตรวจสอบลบเสร็จสิ้น</returns>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!await _service.DeleteUserAsync(id)) return NotFound();
        return NoContent();
    }
}