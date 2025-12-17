using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public VendorController(LinenDbContext context) => _context = context;

        [HttpGet] public async Task<ActionResult<IEnumerable<Vendor>>> Get() => await _context.Vendors.ToListAsync();
        [HttpGet("{id}")] public async Task<ActionResult<Vendor>> Get(int id) { var item = await _context.Vendors.FindAsync(id); return item == null ? NotFound() : item; }
        [HttpPost] public async Task<ActionResult<Vendor>> Post(Vendor item) { _context.Vendors.Add(item); await _context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { id = item.VendorId }, item); }
        [HttpPut("{id}")] public async Task<IActionResult> Put(int id, Vendor item) { if (id != item.VendorId) return BadRequest(); _context.Entry(item).State = EntityState.Modified; await _context.SaveChangesAsync(); return NoContent(); }
        [HttpDelete("{id}")] public async Task<IActionResult> Delete(int id) { var item = await _context.Vendors.FindAsync(id); if (item == null) return NotFound(); _context.Vendors.Remove(item); await _context.SaveChangesAsync(); return NoContent(); }
    }
}