using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReaderController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public ReaderController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Reader>>> Get() => await _context.Readers.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Reader>> Get(int id) { var item = await _context.Readers.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Reader>> Post(Reader item) { _context.Readers.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.ReaderId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Reader item) { if (id != item.ReaderId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Readers.FindAsync(id); if (item == null) return NotFound(); _context.Readers.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}