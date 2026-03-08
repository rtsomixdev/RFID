using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

/// <summary>
/// ควบคุมชั้นและพื้นที่หอผู้ป่วย หรือส่วนบริการแยกส่วนต่างๆ ของระบบโรงพยาบาล
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class WardController : ControllerBase
{
    private readonly Services.IWardService _service;

    /// <summary>
    /// กำหนดค่าเริ่มต้นให้กับ WardController
    /// </summary>
    /// <param name="service">บริการสำหรับการจัดการข้อมูลวอร์ด</param>
    public WardController(Services.IWardService service)
    {
        _service = service;
    }

    /// <summary>
    /// ดึงรายการหอผู้ป่วย(Ward) ที่มีข้อมูลทั้งหมด
    /// </summary>
    /// <returns>โครงสร้างข้อมูลวอร์ดทั้งหมด</returns>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ward>>> GetWards()
    {
        return Ok(await _service.GetWardsAsync());
    }

    /// <summary>
    /// ทำการยืนยันและการบันทึกหอผู้ป่วยใหม่
    /// </summary>
    /// <param name="ward">ชื่อและข้อมูลประกอบของวอร์ด</param>
    /// <returns>โครงสร้างข้อมูลหลังการส่งแจ้งระบบแล้ว</returns>
    [HttpPost]
    public async Task<ActionResult<Ward>> PostWard(Ward ward)
    {
        var result = await _service.PostWardAsync(ward);
        if (result.Status == 500) return StatusCode(500, new { message = result.Message });
        return CreatedAtAction("GetWards", new { id = result.Item?.WardId }, result.Item);
    }

    /// <summary>
    /// ถอดถอนหอผู้ป่วยออกจากระบบ
    /// </summary>
    /// <param name="id">รหัสวอร์ดที่เลิกใช้งาน</param>
    /// <returns>รหัสสถานการณ์หลังจากลบส่วนปฏิบัติการแล้ว</returns>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWard(int id)
    {
        var result = await _service.DeleteWardAsync(id);
        if (result.Status == 404) return NotFound();

        return NoContent();
    }
}