using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LinenLogController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public LinenLogController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<LinenLog>>> Get() => await _context.LinenLogs.OrderByDescending(x => x.LogId).Take(100).ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<LinenLog>> Get(long id) { var item = await _context.LinenLogs.FindAsync(id); return item == null ? NotFound() : item; }
        
        // แก้จาก LinenLogId เป็น LogId ตาม SQL
        [HttpPost] public async Task<ActionResult<LinenLog>> Post(LinenLog item) { _context.LinenLogs.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.LogId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(long id, LinenLog item) { if (id != item.LogId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(long id) { var item = await _context.LinenLogs.FindAsync(id); if (item == null) return NotFound(); _context.LinenLogs.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}