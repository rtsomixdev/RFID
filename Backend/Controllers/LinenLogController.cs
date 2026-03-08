using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการจัดการประวัติและการเคลื่อนไหวของผ้า (Linen Logs)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class LinenLogController : ControllerBase
    {
        private readonly Services.ILinenLogService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ LinenLogController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการข้อมูลประวัติของผ้า</param>
        public LinenLogController(Services.ILinenLogService service) => _service = service;

        /// <summary>
        /// ดึงข้อมูลประวัติการทำงานของผ้าทั้งหมด
        /// </summary>
        /// <returns>รายการประวัติทั้งหมด</returns>
        [HttpGet] public async Task<ActionResult<IEnumerable<LinenLog>>> Get() => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลประวัติตามรหัสการบันทึกที่ระบุ
        /// </summary>
        /// <param name="id">รหัสการบันทึก (LogId)</param>
        /// <returns>ข้อมูลประวัติที่พบ</returns>
        [HttpGet("{id}")] public async Task<ActionResult<LinenLog>> Get(long id) { var item = await _service.GetAsync(id); return item == null ? NotFound() : Ok(item); }
        
        /// <summary>
        /// สร้างข้อมูลประวัติการทำงานของผ้าเข้าสู่ระบบ
        /// </summary>
        /// <param name="item">ข้อมูลประวัติที่ต้องการบันทึก</param>
        /// <returns>ข้อมูลประวัติที่ถูกสร้างเรียบร้อยแล้ว</returns>
        [HttpPost] public async Task<ActionResult<LinenLog>> Post(LinenLog item) { var createdItem = await _service.PostAsync(item); return CreatedAtAction(nameof(Get), new { id = createdItem.LogId }, createdItem); }

        /// <summary>
        /// อัปเดตข้อมูลประวัติของผ้าตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสการบันทึก (LogId)</param>
        /// <param name="item">ข้อมูลประวัติที่ต้องการอัปเดต</param>
        /// <returns>ผลลัพธ์การอัปเดตข้อมูล</returns>
        [HttpPut("{id}")] public async Task<IActionResult> Put(long id, LinenLog item) { if (!await _service.PutAsync(id, item)) return BadRequest(); return NoContent(); }

        /// <summary>
        /// ลบข้อมูลประวัติของผ้าตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสการบันทึก (LogId)</param>
        /// <returns>ผลลัพธ์การลบข้อมูล</returns>
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(long id) { if (!await _service.DeleteAsync(id)) return NotFound(); return NoContent(); }
    }
}