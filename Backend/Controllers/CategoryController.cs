using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public CategoryController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Category>>> Get() => await _context.Categories.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Category>> Get(int id) { var item = await _context.Categories.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Category>> Post(Category item) { _context.Categories.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.CategoryId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Category item) { if (id != item.CategoryId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Categories.FindAsync(id); if (item == null) return NotFound(); _context.Categories.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}