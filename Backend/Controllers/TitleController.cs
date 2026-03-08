using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมข้อมูลคำนำหน้าชื่อบุคคล
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class TitleController : ControllerBase
    {
        private readonly Services.ITitleService _service;
        
        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ TitleController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการคำนำหน้า</param>
        public TitleController(Services.ITitleService service) => _service = service;

        /// <summary>
        /// ดึงรายการคำนำหน้าชื่อทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลคำนำหน้าชื่อ</returns>
        [HttpGet] public async Task<ActionResult<IEnumerable<Title>>> Get() => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลคำนำหน้าชื่อตามรหัส
        /// </summary>
        /// <param name="id">รหัสคำนำหน้าชื่อ</param>
        /// <returns>ข้อมูลคำนำหน้าชื่อ</returns>
        [HttpGet("{id}")] public async Task<ActionResult<Title>> Get(int id) { var item = await _service.GetAsync(id); return item == null ? NotFound() : Ok(item); }
        
        /// <summary>
        /// เพิ่มคำนำหน้าชื่อใหม่เข้าสู่ระบบ
        /// </summary>
        /// <param name="item">ข้อมูลคำนำหน้าชื่อใหม่</param>
        /// <returns>ข้อมูลคำนำหน้าที่ได้รับการบันทึก</returns>
        [HttpPost] public async Task<ActionResult<Title>> Post(Title item) { var createdItem = await _service.PostAsync(item); return CreatedAtAction(nameof(Get), new { id = createdItem.TitleId }, createdItem); }
        
        /// <summary>
        /// แก้ไขรายละเอียดคำนำหน้าชื่อ
        /// </summary>
        /// <param name="id">รหัสคำนำหน้าชื่อ</param>
        /// <param name="item">ข้อมูลส่วนคำนำหน้าที่ปรับแก้แล้ว</param>
        /// <returns>ผลตอบรับกรณีที่ผ่าน</returns>
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Title item) { if (!await _service.PutAsync(id, item)) return BadRequest(); return NoContent(); }
        
        /// <summary>
        /// ลบคำนำหน้าชื่อออก
        /// </summary>
        /// <param name="id">รหัสคำนำหน้าชื่อ</param>
        /// <returns>ผลตอบรับระบบเมื่อล้างออก</returns>
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { if (!await _service.DeleteAsync(id)) return NotFound(); return NoContent(); }
    }
}