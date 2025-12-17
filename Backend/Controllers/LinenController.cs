using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class LinenController : ControllerBase
{
    private readonly LinenDbContext _context;

    public LinenController(LinenDbContext context)
    {
        _context = context;
    }

    // GET: api/Linen (ดึงรายการผ้าทั้งหมด)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Linen>>> GetLinens()
    {
        return await _context.Linens
            .Include(l => l.Product) // Join เอาชื่อสินค้ามาโชว์
            .Include(l => l.Hospital) // Join เอาชื่อโรงพยาบาล
            .OrderByDescending(l => l.RegisteredAt) // เอาที่เพิ่งเพิ่มขึ้นก่อน
            .ToListAsync();
    }

    // POST: api/Linen (เพิ่มผ้าใหม่)
    [HttpPost]
    public async Task<ActionResult<Linen>> PostLinen(Linen linen)
    {
        // 1. เช็คว่า RFID นี้มีในระบบหรือยัง?
        var exists = await _context.Linens.AnyAsync(l => l.RfidCode == linen.RfidCode);
        if (exists)
        {
            return BadRequest(new { message = $"RFID Code '{linen.RfidCode}' มีอยู่ในระบบแล้ว!" });
        }

        // 2. กำหนดค่าเริ่มต้น
        linen.RegisteredAt = DateTime.UtcNow;
        linen.IsActive = true;

        // 3. บันทึก
        _context.Linens.Add(linen);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, new { message = "Save Error: " + ex.Message });
        }

        return CreatedAtAction("GetLinens", new { id = linen.LinenId }, linen);
    }
    
    // DELETE: api/Linen/5 (ลบผ้า)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLinen(int id)
    {
        var linen = await _context.Linens.FindAsync(id);
        if (linen == null) return NotFound();

        _context.Linens.Remove(linen);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}