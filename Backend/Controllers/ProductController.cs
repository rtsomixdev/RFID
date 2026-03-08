using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Linq; 

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลสำหรับการอัปเดตกฎและเงื่อนไขของสินค้า
    /// </summary>
    public class ProductRulesUpdateDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public int MaxWashCount { get; set; }
        public int MaxLifespanDays { get; set; }
    }

    /// <summary>
    /// ควบคุมการจัดการข้อมูลสินค้าภายในระบบ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly Services.IProductService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ ProductController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการสินค้า</param>
        public ProductController(Services.IProductService service) => _service = service;

        /// <summary>
        /// ดึงรายการข้อมูลสินค้าทั้งหมดในระบบ
        /// </summary>
        /// <returns>รายการสินค้าทั้งหมด</returns>
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Product>>> Get() 
        {
            return Ok(await _service.GetAsync());
        }

        /// <summary>
        /// ดึงข้อมูลสินค้าโดยระบุรหัสประจำสินค้า
        /// </summary>
        /// <param name="id">รหัสประจำสินค้า</param>
        /// <returns>ข้อมูลสินค้าที่ค้นพบ</returns>
        [HttpGet("{id}")] 
        public async Task<ActionResult<Product>> Get(int id) 
        { 
            var item = await _service.GetAsync(id); 
            return item == null ? NotFound() : Ok(item); 
        }

        /// <summary>
        /// เพิ่มข้อมูลสินค้าใหม่เข้าสู่ระบบ
        /// </summary>
        /// <param name="item">ข้อมูลของสินค้า</param>
        /// <returns>สถานะการเพิ่มข้อมูลสินค้าและข้อมูล</returns>
        [HttpPost] 
        public async Task<ActionResult<Product>> Post(Product item) 
        { 
            var createdItem = await _service.PostAsync(item);
            return CreatedAtAction(nameof(Get), new { id = createdItem.ProductId }, createdItem); 
        }

        /// <summary>
        /// อัปเดตข้อมูลและเงื่อนไขของสินค้า
        /// </summary>
        /// <param name="id">รหัสประจำสินค้า</param>
        /// <param name="item">ข้อมูลกฎการอัปเดตต่างๆ</param>
        /// <returns>สถานะพร้อมข้อมูลสินค้าที่ได้รับการอัปเดต</returns>
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, [FromBody] ProductRulesUpdateDto item) 
        { 
            var result = await _service.PutAsync(id, item);
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return result.Message != null ? NotFound(result.Message) : NotFound();
            
            return Ok(result.Item); 
        }

        /// <summary>
        /// ลบข้อมูลสินค้าออกจากระบบ
        /// </summary>
        /// <param name="id">รหัสประจำสินค้าที่ต้องการลบ</param>
        /// <returns>สถานะการลบที่ดำเนินการแล้ว</returns>
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            if (!await _service.DeleteAsync(id)) return NotFound();
            return NoContent(); 
        }

        /// <summary>
        /// ส่งออกข้อมูลสต็อกของสินค้าทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลปริมาณสต็อกและการใช้งานเพื่อการส่งออก</returns>
        [HttpGet("/api/products/export-stock")]
        public async Task<IActionResult> GetStockForExport()
        {
            var result = await _service.GetStockForExportAsync();
            if (result.Status == 500) return StatusCode(500, result.Message);
            return Ok(result.Data);
        }
    }
}