using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequestItemController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public RequestItemController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<RequestItem>>> Get() => await _context.RequestItems.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<RequestItem>> Get(long id) { var item = await _context.RequestItems.FindAsync(id); return item == null ? NotFound() : item; }
        
        // แก้จาก RequestItemId เป็น ItemId ตาม SQL
        [HttpPost] public async Task<ActionResult<RequestItem>> Post(RequestItem item) { _context.RequestItems.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.ItemId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(long id, RequestItem item) { if (id != item.ItemId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(long id) { var item = await _context.RequestItems.FindAsync(id); if (item == null) return NotFound(); _context.RequestItems.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}