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

        public SpecialTagController(LinenDbContext context)
        {
            _context = context;
        }

        // 1. GET ALL
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SpecialTag>>> GetSpecialTags()
        {
            return await _context.SpecialTags.ToListAsync();
        }

        // 2. GET BY ID (เพิ่มมาเพื่อให้มาตรฐานครบ)
        [HttpGet("{id}")]
        public async Task<ActionResult<SpecialTag>> GetSpecialTag(string id)
        {
            var tag = await _context.SpecialTags.FindAsync(id);

            if (tag == null)
            {
                return NotFound();
            }

            return tag;
        }

        // 3. POST (Create + Duplicate Check)
        [HttpPost]
        public async Task<ActionResult<SpecialTag>> PostSpecialTag(SpecialTag tag)
        {
            // ✅ Enterprise Logic: เช็คก่อนว่ามี ID นี้ในระบบหรือยัง
            if (await _context.SpecialTags.AnyAsync(e => e.TagId == tag.TagId))
            {
                return Conflict(new { message = $"Tag ID '{tag.TagId}' นี้มีอยู่ในระบบแล้ว" });
            }

            _context.SpecialTags.Add(tag);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (SpecialTagExists(tag.TagId))
                {
                    return Conflict(new { message = "Tag ID already exists." });
                }
                else
                {
                    throw;
                }
            }

            return CreatedAtAction("GetSpecialTag", new { id = tag.TagId }, tag);
        }

        // 4. PUT (Update) - รองรับการแก้ไขจากหน้าเว็บ
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSpecialTag(string id, SpecialTag tag)
        {
            if (id != tag.TagId)
            {
                return BadRequest("Tag ID mismatch");
            }

            _context.Entry(tag).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SpecialTagExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // 5. DELETE (แก้ไขจาก int เป็น string)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSpecialTag(string id)
        {
            var tag = await _context.SpecialTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound();
            }

            _context.SpecialTags.Remove(tag);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool SpecialTagExists(string id)
        {
            return _context.SpecialTags.Any(e => e.TagId == id);
        }
    }
}