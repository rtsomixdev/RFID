using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public RoleController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Role>>> Get() => await _context.Roles.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Role>> Get(int id) { var item = await _context.Roles.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Role>> Post(Role item) { _context.Roles.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.RoleId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Role item) { if (id != item.RoleId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Roles.FindAsync(id); if (item == null) return NotFound(); _context.Roles.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}