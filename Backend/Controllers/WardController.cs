using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class WardController : ControllerBase
{
    private readonly LinenDbContext _context;

    public WardController(LinenDbContext context)
    {
        _context = context;
    }

    // GET: api/Ward
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ward>>> GetWards()
    {
        return await _context.Wards
            .Include(w => w.Hospital) // ดึงชื่อโรงพยาบาลมาด้วย
            .OrderBy(w => w.WardName)
            .ToListAsync();
    }

    // POST: api/Ward
    [HttpPost]
    public async Task<ActionResult<Ward>> PostWard(Ward ward)
    {
        // 1. กำหนดค่า Default
        if (ward.IsActive == null) ward.IsActive = true;

        // 2. ตรวจสอบว่ามีชื่อซ้ำในโรงพยาบาลเดียวกันไหม
        /* (Optional: ถ้าต้องการเปิดเช็คซ้ำ ให้เอา Comment ออก)
        var exists = await _context.Wards.AnyAsync(w => w.WardName == ward.WardName && w.HospitalId == ward.HospitalId);
        if (exists) {
            return BadRequest(new { message = "ชื่อวอร์ดนี้มีอยู่แล้วในโรงพยาบาลที่เลือก" });
        }
        */

        // 3. บันทึก
        _context.Wards.Add(ward);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, new { message = "Save Error: " + ex.Message });
        }

        return CreatedAtAction("GetWards", new { id = ward.WardId }, ward);
    }

    // DELETE: api/Ward/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWard(int id)
    {
        var ward = await _context.Wards.FindAsync(id);
        if (ward == null) return NotFound();

        _context.Wards.Remove(ward);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}