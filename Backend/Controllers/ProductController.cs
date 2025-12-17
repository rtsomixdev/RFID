using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public ProductController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Product>>> Get() => await _context.Products.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Product>> Get(int id) { var item = await _context.Products.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Product>> Post(Product item) { _context.Products.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.ProductId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Product item) { if (id != item.ProductId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Products.FindAsync(id); if (item == null) return NotFound(); _context.Products.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}