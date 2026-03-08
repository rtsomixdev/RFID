using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมข้อมูลพื้นที่และห้องที่ใช้จัดเก็บผ้าหรือจุดใช้งาน
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly Services.IRoomService _service;
        
        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ RoomController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการห้องพักและพื้นที่</param>
        public RoomController(Services.IRoomService service) => _service = service;

        /// <summary>
        /// ดึงรายการข้อมูลห้องทั้งหมดในระบบ
        /// </summary>
        /// <returns>รายการสถานที่และห้องทั้งหมด</returns>
        [HttpGet] public async Task<ActionResult<IEnumerable<Room>>> Get() => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลห้องโดยระบุหมายเลขพื้นที่
        /// </summary>
        /// <param name="id">รหัสประจำห้อง</param>
        /// <returns>รายละเอียดที่เจาะจงของห้องนั้นๆ</returns>
        [HttpGet("{id}")] public async Task<ActionResult<Room>> Get(int id) { var item = await _service.GetAsync(id); return item == null ? NotFound() : Ok(item); }
        
        /// <summary>
        /// เพิ่มข้อมูลห้องใหม่เข้าสู่ฐานข้อมูล
        /// </summary>
        /// <param name="item">ข้อมูลของห้อง</param>
        /// <returns>ผลสัมฤทธิ์การสร้างและข้อมูลของห้องใหม่</returns>
        [HttpPost] public async Task<ActionResult<Room>> Post(Room item) { var createdItem = await _service.PostAsync(item); return CreatedAtAction(nameof(Get), new { id = createdItem.RoomId }, createdItem); }
        
        /// <summary>
        /// อัปเดตข้อมูลของห้อง เช่น เปลี่ยนชื่อหรือที่เกี่ยวโยง
        /// </summary>
        /// <param name="id">รหัสประจำห้อง</param>
        /// <param name="item">ข้อมูลห้องที่จะทับรายละเอียดเก่า</param>
        /// <returns>สถานะลัพธ์การแก้ไข</returns>
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Room item) { if (!await _service.PutAsync(id, item)) return BadRequest(); return NoContent(); }
        
        /// <summary>
        /// ลบข้อมูลห้องออกจากระบบ
        /// </summary>
        /// <param name="id">รหัสประจำพื้นที่ห้องที่ต้องการลบ</param>
        /// <returns>สถานะผลลัพธ์การลบ</returns>
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { if (!await _service.DeleteAsync(id)) return NotFound(); return NoContent(); }
    }
}