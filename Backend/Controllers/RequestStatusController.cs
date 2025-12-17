using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequestStatusController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public RequestStatusController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<RequestStatus>>> Get() => await _context.RequestStatuses.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<RequestStatus>> Get(int id) { var item = await _context.RequestStatuses.FindAsync(id); return item == null ? NotFound() : item; }
        
        // แก้จาก RequestStatusId เป็น StatusId ตาม SQL
        [HttpPost] public async Task<ActionResult<RequestStatus>> Post(RequestStatus item) { _context.RequestStatuses.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.StatusId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, RequestStatus item) { if (id != item.StatusId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.RequestStatuses.FindAsync(id); if (item == null) return NotFound(); _context.RequestStatuses.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}