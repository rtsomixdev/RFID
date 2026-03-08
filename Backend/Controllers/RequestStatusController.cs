using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมข้อมูลสถานะพื้นฐานที่นำไปใช้ในใบคำร้อง
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class RequestStatusController : ControllerBase
    {
        private readonly Services.IRequestStatusService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ RequestStatusController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการสถานะของคำร้อง</param>
        public RequestStatusController(Services.IRequestStatusService service) => _service = service;

        /// <summary>
        /// ดึงรายการสถานะทั้งหมดของคำร้อง
        /// </summary>
        /// <returns>ชุดข้อมูลสถานะ</returns>
        [HttpGet] public async Task<ActionResult<IEnumerable<RequestStatus>>> Get() => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลสถานะตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสสถานะ</param>
        /// <returns>ข้อมูลสถานะที่ต้องการค้นหา</returns>
        [HttpGet("{id}")] public async Task<ActionResult<RequestStatus>> Get(int id) { var item = await _service.GetAsync(id); return item == null ? NotFound() : Ok(item); }
        
        /// <summary>
        /// เพิ่มข้อมูลสถานะใบคำร้องใหม่
        /// </summary>
        /// <param name="item">ข้อมูลสถานะใหม่</param>
        /// <returns>ข้อมูลสถานะที่ได้รับการบันทึก</returns>
        [HttpPost] public async Task<ActionResult<RequestStatus>> Post(RequestStatus item) { var createdItem = await _service.PostAsync(item); return CreatedAtAction(nameof(Get), new { id = createdItem.StatusId }, createdItem); }

        /// <summary>
        /// อัปเดตข้อมูลสถานะใบคำร้อง
        /// </summary>
        /// <param name="id">รหัสสถานะที่ต้องการตรวจสอบและแก้ไข</param>
        /// <param name="item">ข้อมูลที่ต้องการแก้ไข</param>
        /// <returns>สถานะลัพธ์การแก้ไข</returns>
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, RequestStatus item) { if (!await _service.PutAsync(id, item)) return BadRequest(); return NoContent(); }

        /// <summary>
        /// ลบข้อมูลสถานะใบคำร้อง
        /// </summary>
        /// <param name="id">รหัสสถานะที่ต้องการลบ</param>
        /// <returns>สถานะผลลัพธ์การลบ</returns>
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { if (!await _service.DeleteAsync(id)) return NotFound(); return NoContent(); }
    }
}