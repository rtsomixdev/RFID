using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการจัดการป้ายระบุสิทธิ์พิเศษ (Special Tags)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class SpecialTagController : ControllerBase
    {
        private readonly Services.ISpecialTagService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ SpecialTagController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการป้ายพิเศษ</param>
        public SpecialTagController(Services.ISpecialTagService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงรายการป้ายพิเศษทั้งหมดในระบบ
        /// </summary>
        /// <returns>ชุดข้อมูลป้ายพิเศษ</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SpecialTag>>> GetSpecialTags()
        {
            return Ok(await _service.GetSpecialTagsAsync());
        }

        /// <summary>
        /// ค้นหาข้อมูลป้ายพิเศษตามรหัส RFID
        /// </summary>
        /// <param name="id">รหัสป้ายพิเศษ</param>
        /// <returns>รายละเอียดที่ตรงกับรหัสที่ระบุ</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<SpecialTag>> GetSpecialTag(string id)
        {
            var tag = await _service.GetSpecialTagAsync(id);

            if (tag == null)
            {
                return NotFound();
            }

            return Ok(tag);
        }

        /// <summary>
        /// เพิ่มป้ายพิเศษใหม่เข้าระบบ
        /// </summary>
        /// <param name="tag">ข้อมูลป้ายพิเศษใหม่</param>
        /// <returns>สถานะพร้อมข้อมูลป้ายที่บันทึกสำเร็จ</returns>
        [HttpPost]
        public async Task<ActionResult<SpecialTag>> PostSpecialTag(SpecialTag tag)
        {
            var result = await _service.PostSpecialTagAsync(tag);
            
            if (result.Status == 409) return Conflict(new { message = result.Message });

            return CreatedAtAction("GetSpecialTag", new { id = result.Item?.TagId }, result.Item);
        }

        /// <summary>
        /// แกัไขข้อมูลป้ายพิเศษเดิม
        /// </summary>
        /// <param name="id">รหัสป้ายที่ต้องการเปลี่ยน</param>
        /// <param name="tag">ข้อมูลที่แก้ไขแล้ว</param>
        /// <returns>สถานะลัพธ์การแก้ไข</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSpecialTag(string id, SpecialTag tag)
        {
            var result = await _service.PutSpecialTagAsync(id, tag);
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound();

            return NoContent();
        }

        /// <summary>
        /// ลบข้อมูลป้ายพิเศษ
        /// </summary>
        /// <param name="id">รหัสป้ายพิเศษที่ต้องการลบฝัง</param>
        /// <returns>สถานะลัพธ์การลบ</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSpecialTag(string id)
        {
            var result = await _service.DeleteSpecialTagAsync(id);
            if (result.Status == 404) return NotFound();

            return NoContent();
        }
    }
}