using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมรายการย่อยภายในใบคำร้องแต่ละใบ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class RequestItemController : ControllerBase
    {
        private readonly Services.IRequestItemService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ RequestItemController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการรายการคำร้อง</param>
        public RequestItemController(Services.IRequestItemService service) => _service = service;

        /// <summary>
        /// ดึงข้อมูลรายการคำร้องย่อยทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลรายการคำร้อง</returns>
        [HttpGet] public async Task<ActionResult<IEnumerable<RequestItem>>> Get() => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลรายการคำร้องย่อยตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสรายการคำร้อง</param>
        /// <returns>ข้อมูลของรายการที่ต้องการค้นหา</returns>
        [HttpGet("{id}")] public async Task<ActionResult<RequestItem>> Get(long id) { var item = await _service.GetAsync(id); return item == null ? NotFound() : Ok(item); }
        
        /// <summary>
        /// เพิ่มรายการคำร้องย่อยใหม่
        /// </summary>
        /// <param name="item">ข้อมูลรายการใหม่ที่ต้องการเพิ่ม</param>
        /// <returns>ข้อมูลรายการที่ได้รับการบันทึก</returns>
        [HttpPost] public async Task<ActionResult<RequestItem>> Post(RequestItem item) { var createdItem = await _service.PostAsync(item); return CreatedAtAction(nameof(Get), new { id = createdItem.ItemId }, createdItem); }

        /// <summary>
        /// อัปเดตข้อมูลรายการคำร้องย่อย
        /// </summary>
        /// <param name="id">รหัสรายการคำร้องที่ต้องการอัปเดต</param>
        /// <param name="item">ข้อมูลที่ต้องการแก้ไข</param>
        /// <returns>สถานะลัพธ์การแก้ไข</returns>
        [HttpPut("{id}")] public async Task<IActionResult> Put(long id, RequestItem item) { if (!await _service.PutAsync(id, item)) return BadRequest(); return NoContent(); }

        /// <summary>
        /// ลบรายการคำร้องย่อยตามรหัส
        /// </summary>
        /// <param name="id">รหัสรายการคำร้องที่ต้องการลบ</param>
        /// <returns>สถานะลัพธ์การลบ</returns>
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(long id) { if (!await _service.DeleteAsync(id)) return NotFound(); return NoContent(); }
    }
}