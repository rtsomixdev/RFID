using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Linq; // จำเป็นสำหรับ LINQ

namespace Backend.Controllers
{
    // ✅ 1. Class DTO เดิมของคุณ (คงไว้เหมือนเดิม)
    public class ProductRulesUpdateDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
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
        // ✅ Logic เดิม (คงไว้)
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Product>>> Get() 
        {
            return await _context.Products
                .Include(p => p.Category) 
                .ToListAsync();
        }

        // GET: api/Product/5
        // ✅ Logic เดิม (คงไว้)
        [HttpGet("{id}")] 
        public async Task<ActionResult<Product>> Get(int id) 
        { 
            var item = await _context.Products.FindAsync(id); 
            return item == null ? NotFound() : item; 
        }

        // POST: api/Product
        // ✅ Logic เดิม (คงไว้)
        [HttpPost] 
        public async Task<ActionResult<Product>> Post(Product item) 
        { 
            _context.Products.Add(item); 
            await _context.SaveChangesAsync(); 
            return CreatedAtAction(nameof(Get), new { id = item.ProductId }, item); 
        }

        // PUT: api/Product/5
        // ✅ Logic เดิม (คงไว้ 100%)
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, [FromBody] ProductRulesUpdateDto item) 
        { 
            if (id != item.ProductId) return BadRequest("ID ไม่ตรงกัน"); 

            var existingProduct = await _context.Products.FindAsync(id);
            
            if (existingProduct == null) return NotFound("ไม่พบสินค้า");

            existingProduct.MaxWashCount = item.MaxWashCount;
            existingProduct.MaxLifespanDays = item.MaxLifespanDays;
            
            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Products.Any(e => e.ProductId == id)) return NotFound();
                else throw;
            }

            return Ok(existingProduct); 
        }

        // DELETE: api/Product/5
        // ✅ Logic เดิม (คงไว้)
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            var item = await _context.Products.FindAsync(id); 
            if (item == null) return NotFound(); 
            _context.Products.Remove(item); 
            await _context.SaveChangesAsync(); 
            return NoContent(); 
        }

        // =========================================================
        // ✅ ส่วนที่เพิ่มใหม่ (อยู่ล่างสุด ไม่กระทบของเดิม)
        // =========================================================
        
        // ใช้ / นำหน้า เพื่อบังคับ Route ให้ตรงกับ React (api/products/...) 
        // โดยไม่สนใจว่า Controller นี้ชื่อ Product (ไม่มี s)
        [HttpGet("/api/products/export-stock")]
        public async Task<IActionResult> GetStockForExport()
        {
            try
            {
                // ดึงข้อมูลจาก Linens Join กับ Products และ Categories
                var data = await (from l in _context.Linens  
                                  join p in _context.Products on l.ProductId equals p.ProductId
                                  join c in _context.Categories on p.CategoryId equals c.CategoryId
                                  where l.IsActive == true   // เอาเฉพาะที่ Active
                                  orderby p.ProductCode
                                  select new
                                  {
                                      fabric_category = c.CategoryName,
                                      fabric_type = p.ProductName,
                                      fabric_no = p.ProductCode,
                                      fabric_detail = p.SizeSpec, // ใช้ SizeSpec ตาม DB คุณ
                                      fabric_unit = p.UnitName ?? "ชิ้น", 
                                      rfid_code = l.RfidCode         
                                  }).ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Export Error: " + ex.Message);
            }
        }
    }
}