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

        // 2. เริ่ม Transaction (เพื่อความปลอดภัยของข้อมูล)
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // -------------------------------------------------------
            // Step A: บันทึก Ward ก่อน (เพื่อให้ได้ WardId)
            // -------------------------------------------------------
            _context.Wards.Add(ward);
            await _context.SaveChangesAsync(); // จังหวะนี้จะได้ ward.WardId มาแล้ว

            // -------------------------------------------------------
            // Step B: Auto Sync สร้าง Room (ถ้ายังไม่มี)
            // -------------------------------------------------------
            // เช็คว่ามีห้องชื่อนี้หรือยัง?
            var roomExists = await _context.Rooms.AnyAsync(r => r.RoomName == ward.WardName);
            if (!roomExists)
            {
                var newRoom = new Room
                {
                    RoomName = ward.WardName,
                    Description = "หอผู้ป่วย (Auto Sync)",
                    WardId = ward.WardId, // ✅ เอา ID จากขั้นตอนแรกมาใส่ได้เลย!
                    // IsActive หรือ CreatedAt ปล่อยให้ Database จัดการ (Default Value)
                };
                
                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync(); // บันทึกห้องตามเข้าไป
            }

            // -------------------------------------------------------
            // Step C: ยืนยันการบันทึกทั้งหมด
            // -------------------------------------------------------
            await transaction.CommitAsync();

            return CreatedAtAction("GetWards", new { id = ward.WardId }, ward);
        }
        catch (Exception ex)
        {
            // ❌ ถ้ามีอะไรพัง ให้ยกเลิกทั้งหมด (ไม่ให้มีข้อมูลขยะ)
            await transaction.RollbackAsync();

            // 🔥 ดึงข้อความ Error จริงๆ ออกมาดู (Inner Exception)
            var realError = ex.InnerException?.Message ?? ex.Message;
            Console.WriteLine($"❌ Save Error: {realError}"); // ดูใน Terminal ได้เลย

            return StatusCode(500, new { message = "บันทึกไม่สำเร็จ: " + realError });
        }
    }

    // DELETE: api/Ward/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWard(int id)
    {
        var ward = await _context.Wards.FindAsync(id);
        if (ward == null) return NotFound();

        // (Optional) ลบ Room ที่ผูกกับ Ward นี้ด้วยก็ได้ถ้าต้องการ
        /* var linkedRoom = await _context.Rooms.FirstOrDefaultAsync(r => r.WardId == id);
        if(linkedRoom != null) _context.Rooms.Remove(linkedRoom);
        */

        _context.Wards.Remove(ward);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}