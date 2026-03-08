using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมจัดการข้อมูลผู้จัดจำหน่าย (Vendor) และบริษัทภายนอก
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class VendorController : ControllerBase
    {
        private readonly Services.IVendorService _service;
        
        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ VendorController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการตัวแทนผู้จัดจำหน่าย</param>
        public VendorController(Services.IVendorService service) => _service = service;

        /// <summary>
        /// ดึงรายการผู้จัดจำหน่ายและบริษัทคู่ค้าทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลบริษัทผู้จัดจำหน่าย</returns>
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Vendor>>> Get() 
        {
            return Ok(await _service.GetAsync());
        }

        /// <summary>
        /// ดึงข้อมูลเฉพาะของผู้จัดจำหน่ายตามรหัสแวะตรวจ
        /// </summary>
        /// <param name="id">รหัสผู้จัดจำหน่าย</param>
        /// <returns>ลักษณะนามบริษัทที่บันทึกร่วม</returns>
        [HttpGet("{id}")] 
        public async Task<ActionResult<Vendor>> Get(int id) 
        { 
            var item = await _service.GetAsync(id); 
            return item == null ? NotFound() : Ok(item); 
        }

        /// <summary>
        /// เพิ่มรายการบริษัทจัดจำหน่ายหรือตัวแทนเข้าสู่สารบบ
        /// </summary>
        /// <param name="item">ข้อมูลผู้จัดจำหน่ายใหม่</param>
        /// <returns>สถานะพร้อมรหัสตัวแทนใหม่ที่เพิ่งออก</returns>
        [HttpPost] 
        public async Task<ActionResult<Vendor>> Post(Vendor item) 
        { 
            var result = await _service.PostAsync(item);
            if (result.Status == 500) return StatusCode(500, result.Message);
            return CreatedAtAction(nameof(Get), new { id = result.Item?.VendorId }, result.Item);
        }

        /// <summary>
        /// อัปเดตข้อมูลรายละเอียดของผู้จัดจำหน่ายองค์กร
        /// </summary>
        /// <param name="id">รหัสประจำผู้จัดจำหน่าย</param>
        /// <param name="item">การเปลี่ยนแปลงเชิงลึกของผู้จัดจำหน่าย</param>
        /// <returns>ปรับปรุงแฟ้มระบบพร้อมรีเทิร์นรายการส่งกลับ</returns>
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, Vendor item) 
        { 
            var result = await _service.PutAsync(id, item);
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return result.Message != null ? NotFound(result.Message) : NotFound();

            return Ok(result.Item); 
        }

        /// <summary>
        /// ลบจุดเช็คสภาพหรือข้อมูลองค์กรตัวแทนที่ใช้งานอยู่
        /// </summary>
        /// <param name="id">หมายเลขผู้รับจัดจำหน่าย</param>
        /// <returns>สถานะระดับแจ้งเตือนผลสัมฤทธิ์</returns>
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