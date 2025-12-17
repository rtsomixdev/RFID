using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HospitalController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public HospitalController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Hospital>>> Get() => await _context.Hospitals.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Hospital>> Get(int id) { var item = await _context.Hospitals.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Hospital>> Post(Hospital item) { _context.Hospitals.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.HospitalId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Hospital item) { if (id != item.HospitalId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Hospitals.FindAsync(id); if (item == null) return NotFound(); _context.Hospitals.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}