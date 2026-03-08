using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการจัดการข้อมูลโรงพยาบาล
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class HospitalController : ControllerBase
    {
        private readonly Services.IHospitalService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ HospitalController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการข้อมูลโรงพยาบาล</param>
        public HospitalController(Services.IHospitalService service) => _service = service;

        /// <summary>
        /// ดึงข้อมูลโรงพยาบาลทั้งหมด
        /// </summary>
        /// <returns>รายการโรงพยาบาลทั้งหมด</returns>
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Hospital>>> Get() 
        {
            return Ok(await _service.GetAsync());
        }

        /// <summary>
        /// ดึงข้อมูลโรงพยาบาลตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาล</param>
        /// <returns>ข้อมูลโรงพยาบาลที่พบ</returns>
        [HttpGet("{id}")] 
        public async Task<ActionResult<Hospital>> Get(int id) 
        { 
            var item = await _service.GetAsync(id); 
            return item == null ? NotFound() : Ok(item); 
        }

        /// <summary>
        /// สร้างข้อมูลโรงพยาบาลใหม่
        /// </summary>
        /// <param name="item">ข้อมูลโรงพยาบาลที่ต้องการสร้าง</param>
        /// <returns>ข้อมูลโรงพยาบาลที่ถูกสร้างเรียบร้อยแล้ว</returns>
        [HttpPost] 
        public async Task<ActionResult<Hospital>> Post(Hospital item) 
        { 
            var createdItem = await _service.PostAsync(item);
            return CreatedAtAction(nameof(Get), new { id = createdItem.HospitalId }, createdItem); 
        }

        /// <summary>
        /// อัปเดตข้อมูลโรงพยาบาลตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาลที่ต้องการอัปเดต</param>
        /// <param name="item">ข้อมูลโรงพยาบาลใหม่</param>
        /// <returns>ผลลัพธ์การอัปเดตข้อมูล</returns>
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, Hospital item) 
        { 
            var result = await _service.PutAsync(id, item);

            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return result.Message != null ? NotFound(result.Message) : NotFound();

            return Ok(result.Item); 
        }

        /// <summary>
        /// ลบข้อมูลโรงพยาบาลตามรหัสที่ระบุ พร้อมตรวจสอบเงื่อนไขความสัมพันธ์ของข้อมูล
        /// </summary>
        /// <param name="id">รหัสโรงพยาบาลที่ต้องการลบ</param>
        /// <returns>ผลลัพธ์การลบข้อมูล</returns>
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            var result = await _service.DeleteAsync(id);

            if (result.Status == 400) return BadRequest(new { message = result.Message });
            if (result.Status == 404) return NotFound();

            return NoContent(); 
        }
    }
}