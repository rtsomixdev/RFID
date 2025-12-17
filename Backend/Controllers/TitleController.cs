using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TitleController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public TitleController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Title>>> Get() => await _context.Titles.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Title>> Get(int id) { var item = await _context.Titles.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Title>> Post(Title item) { _context.Titles.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.TitleId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Title item) { if (id != item.TitleId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Titles.FindAsync(id); if (item == null) return NotFound(); _context.Titles.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}