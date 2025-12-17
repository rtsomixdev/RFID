using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DamageReasonController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public DamageReasonController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<DamageReason>>> Get() => await _context.DamageReasons.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<DamageReason>> Get(int id) { var item = await _context.DamageReasons.FindAsync(id); return item == null ? NotFound() : item; }
        
        // แก้จาก DamageReasonId เป็น ReasonId ตาม SQL
        [HttpPost] public async Task<ActionResult<DamageReason>> Post(DamageReason item) { _context.DamageReasons.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.ReasonId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, DamageReason item) { if (id != item.ReasonId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.DamageReasons.FindAsync(id); if (item == null) return NotFound(); _context.DamageReasons.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}