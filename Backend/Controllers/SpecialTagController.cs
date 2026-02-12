using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SpecialTagController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public SpecialTagController(LinenDbContext context) { _context = context; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SpecialTag>>> Get() => await _context.SpecialTags.ToListAsync();

        [HttpPost]
        public async Task<ActionResult<SpecialTag>> Post(SpecialTag tag)
        {
            _context.SpecialTags.Add(tag);
            await _context.SaveChangesAsync();
            return Ok(tag);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tag = await _context.SpecialTags.FindAsync(id);
            if (tag == null) return NotFound();
            _context.SpecialTags.Remove(tag);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}