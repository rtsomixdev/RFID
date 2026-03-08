using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการจัดการข้อมูลหมวดหมู่ (Category)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ CategoryController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการหมวดหมู่</param>
        public CategoryController(ICategoryService service) => _service = service;

        /// <summary>
        /// ดึงข้อมูลหมวดหมู่ทั้งหมด
        /// </summary>
        /// <returns>รายการหมวดหมู่ทั้งหมด</returns>
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Category>>> Get() 
            => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลหมวดหมู่ตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่</param>
        /// <returns>ข้อมูลหมวดหมู่ที่พบ</returns>
        [HttpGet("{id}")] 
        public async Task<ActionResult<Category>> Get(int id) 
        { 
            var item = await _service.GetAsync(id); 
            return item == null ? NotFound() : Ok(item); 
        }

        /// <summary>
        /// สร้างข้อมูลหมวดหมู่ใหม่
        /// </summary>
        /// <param name="item">ข้อมูลหมวดหมู่ที่ต้องการสร้าง</param>
        /// <returns>ข้อมูลหมวดหมู่ที่ถูกสร้างเรียบร้อยแล้ว</returns>
        [HttpPost] 
        public async Task<ActionResult<Category>> Post(Category item) 
        { 
            var createdItem = await _service.PostAsync(item);
            return CreatedAtAction(nameof(Get), new { id = createdItem.CategoryId }, createdItem); 
        }

        /// <summary>
        /// อัปเดตข้อมูลหมวดหมู่ตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่ที่ต้องการอัปเดต</param>
        /// <param name="item">ข้อมูลหมวดหมู่ใหม่</param>
        /// <returns>ผลลัพธ์การอัปเดตข้อมูล</returns>
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, Category item) 
        { 
            var success = await _service.PutAsync(id, item);
            if (!success) return BadRequest();
            return NoContent(); 
        }

        /// <summary>
        /// ลบข้อมูลหมวดหมู่ตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสหมวดหมู่ที่ต้องการลบ</param>
        /// <returns>ผลลัพธ์การลบข้อมูล</returns>
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent(); 
        }
    }
}