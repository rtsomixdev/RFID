using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public RoomController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Room>>> Get() => await _context.Rooms.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Room>> Get(int id) { var item = await _context.Rooms.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Room>> Post(Room item) { _context.Rooms.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.RoomId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Room item) { if (id != item.RoomId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Rooms.FindAsync(id); if (item == null) return NotFound(); _context.Rooms.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}