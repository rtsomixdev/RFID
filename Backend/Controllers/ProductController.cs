using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    // ✅ 1. เพิ่ม Class DTO สำหรับรับค่าเฉพาะส่วนที่จะแก้ไข (กัน Error ข้อมูลไม่ครบ)
    public class ProductRulesUpdateDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; } // รับไว้เฉยๆ กัน Frontend ส่งมาแล้ว Error
        public int MaxWashCount { get; set; }
        public int MaxLifespanDays { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public ProductController(LinenDbContext context) => _context = context;

        // GET: api/Product
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Product>>> Get() 
        {
            // Include Category เพื่อให้ Frontend โชว์ชื่อหมวดหมู่ได้
            return await _context.Products
                .Include(p => p.Category) 
                .ToListAsync();
        }

        // GET: api/Product/5
        [HttpGet("{id}")] 
        public async Task<ActionResult<Product>> Get(int id) 
        { 
            var item = await _context.Products.FindAsync(id); 
            return item == null ? NotFound() : item; 
        }

        // POST: api/Product
        [HttpPost] 
        public async Task<ActionResult<Product>> Post(Product item) 
        { 
            _context.Products.Add(item); 
            await _context.SaveChangesAsync(); 
            return CreatedAtAction(nameof(Get), new { id = item.ProductId }, item); 
        }

        // PUT: api/Product/5
        // ✅ 2. แก้ไขให้รับ DTO แทน Product ตัวเต็ม
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, [FromBody] ProductRulesUpdateDto item) 
        { 
            if (id != item.ProductId) return BadRequest("ID ไม่ตรงกัน"); 

            // 3. ดึงข้อมูลเก่าออกมาจาก Database
            var existingProduct = await _context.Products.FindAsync(id);
            
            if (existingProduct == null) return NotFound("ไม่พบสินค้า");

            // 4. อัปเดตเฉพาะค่าที่เราต้องการ
            existingProduct.MaxWashCount = item.MaxWashCount;
            existingProduct.MaxLifespanDays = item.MaxLifespanDays;
            
            // 5. สั่ง Save
            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Products.Any(e => e.ProductId == id)) return NotFound();
                else throw;
            }

            return Ok(existingProduct); // ส่งค่าล่าสุดกลับไปยืนยัน
        }

        // DELETE: api/Product/5
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            var item = await _context.Products.FindAsync(id); 
            if (item == null) return NotFound(); 
            _context.Products.Remove(item); 
            await _context.SaveChangesAsync(); 
            return NoContent(); 
        }
    }
}