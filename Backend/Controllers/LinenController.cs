using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

// Class สำหรับรับข้อมูล Body เวลาแจ้งชำรุด
public class DiscardPayload
{
    public string? RfidCode { get; set; }
    public int? ProductId { get; set; }
    public int DamageReasonId { get; set; }
    public string? Note { get; set; }
    public int ReportedByUserId { get; set; }
}

[Route("api/[controller]")]
[ApiController]
public class LinenController : ControllerBase
{
    private readonly LinenDbContext _context;

    public LinenController(LinenDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // 1. GET: ดึงรายการผ้าที่ยัง Active (สำหรับ Search/Dropdown)
    // ==========================================
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Linen>>> GetLinens()
    {
        return await _context.Linens
            .Include(l => l.Product)
                .ThenInclude(p => p.Category)
            .Include(l => l.Hospital)
            .Where(l => l.IsActive == true) // ดึงเฉพาะตัวที่ยังไม่เสีย/หาย
            .OrderByDescending(l => l.RegisteredAt)
            .ToListAsync();
    }

    // ==========================================
    // 2. GET: ดึงประวัติการแจ้งชำรุด (Soft Delete)
    // ==========================================
    [HttpGet("DiscardHistory")]
    public async Task<ActionResult<IEnumerable<object>>> GetDiscardHistory()
    {
        var history = await _context.Linens
            .Include(l => l.Product)
            .Where(l => l.IsActive == false && l.Status != "Available") // เอาเฉพาะที่เสีย/หาย
            .OrderByDescending(l => l.UpdatedAt)
            .Take(50) // ดึง 50 รายการล่าสุด
            .Select(l => new 
            {
                id = l.LinenId,
                item = l.Product != null ? l.Product.ProductName : ("RFID: " + l.RfidCode), 
                reason = l.Status,
                time = l.UpdatedAt.HasValue ? l.UpdatedAt.Value.ToLocalTime().ToString("dd/MM/yy HH:mm") : "-"
            })
            .ToListAsync();

        return Ok(history);
    }

    // ==========================================
    // 3. GET: ดึงประวัติการลบถาวร (ดึงจาก SystemLogs)
    // ==========================================
    [HttpGet("DeleteHistory")]
    public async Task<ActionResult<IEnumerable<object>>> GetDeleteHistory()
    {
        var logs = await _context.SystemLogs
            .Where(x => x.ActionType == "DELETE_LINEN") // กรองเฉพาะ Log การลบ
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .Select(x => new 
            {
                id = x.LogId,
                item = x.Description, // ชื่อผ้าที่ถูกลบไป
                time = x.CreatedAt.ToLocalTime().ToString("dd/MM/yy HH:mm")
            })
            .ToListAsync();

        return Ok(logs);
    }

    // ==========================================
    // ✅ 4. GET: ดึงข้อมูลล่าสุดสำหรับหน้า Monitor (Real-time List 50 Items)
    // ==========================================
    [HttpGet("Monitor/Latest")]
    public async Task<IActionResult> GetLatestMonitor()
    {
        // ดึง 50 รายการล่าสุดที่มีการอัปเดต (ไม่สนสถานะ เพื่อโชว์ความเคลื่อนไหว)
        var recentItems = await _context.Linens
            .Include(l => l.Product)
            .OrderByDescending(l => l.UpdatedAt) // เรียงจากล่าสุด
            .Take(50) 
            .ToListAsync();

        // ถ้าไม่มีข้อมูลเลย ให้ส่ง List ว่างกลับไป
        if (!recentItems.Any()) 
        {
            return Ok(new List<object>()); 
        }

        // แปลงข้อมูลให้ Frontend นำไปใช้ง่ายๆ
        var result = recentItems.Select(l => 
        {
            // Logic จำลองสถานที่ (Location) ตามสถานะ
            // (ในอนาคตถ้ามี Table Location ค่อยมาแก้ตรงนี้ครับ)
            string loc = "จุดรับผ้าเปื้อน (Dirty Zone)"; 
            if (l.Status == "Available") loc = "คลังผ้าสะอาด (Clean Stock)";
            else if (l.Status == "Damaged" || l.Status != "Available") loc = "ห้องคัดแยกชำรุด";

            return new 
            {
                rfid = l.RfidCode,
                productName = l.Product?.ProductName ?? "Unknown",
                location = loc, 
                status = l.Status,
                timestamp = l.UpdatedAt.HasValue 
                    ? l.UpdatedAt.Value.ToLocalTime().ToString("HH:mm:ss") 
                    : "-"
            };
        });

        return Ok(result);
    }

    // ==========================================
    // 5. POST: แจ้งชำรุด (Soft Delete - เก็บประวัติใน Table Linens)
    // ==========================================
    [HttpPost("Discard")]
    public async Task<IActionResult> DiscardLinen([FromBody] DiscardPayload payload)
    {
        try 
        {
            var reasonName = "Damaged"; 
            var reason = await _context.DamageReasons.FindAsync(payload.DamageReasonId);
            if (reason != null) reasonName = reason.ReasonName;

            if (!string.IsNullOrEmpty(payload.RfidCode))
            {
                var linen = await _context.Linens.FirstOrDefaultAsync(l => l.RfidCode == payload.RfidCode);
                if (linen == null) return NotFound(new { message = $"ไม่พบรหัส RFID: {payload.RfidCode}" });

                linen.IsActive = false;       // ตัดออกจาก Active
                linen.Status = reasonName;    // อัปเดตสถานะเป็นสาเหตุ
                linen.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = "บันทึกแจ้งชำรุดสำเร็จ" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error: " + ex.Message });
        }
    }

    // ==========================================
    // 6. POST: เพิ่มผ้าใหม่ (Register)
    // ==========================================
    [HttpPost]
    public async Task<ActionResult<Linen>> PostLinen(Linen linen)
    {
        var exists = await _context.Linens.AnyAsync(l => l.RfidCode == linen.RfidCode);
        if (exists) return BadRequest(new { message = $"RFID {linen.RfidCode} มีอยู่แล้ว" });

        linen.RegisteredAt = DateTime.UtcNow;
        linen.UpdatedAt = DateTime.UtcNow; // เพิ่มบรรทัดนี้ เพื่อให้ Monitor เห็นทันทีที่เพิ่ม
        linen.IsActive = true;
        linen.Status = "Available"; 

        _context.Linens.Add(linen);
        await _context.SaveChangesAsync();
        return CreatedAtAction("GetLinens", new { id = linen.LinenId }, linen);
    }
    
    // ==========================================
    // 7. DELETE: ลบถาวร (Hard Delete) + บันทึก Log
    // ==========================================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLinen(int id)
    {
        var linen = await _context.Linens
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.LinenId == id);

        if (linen == null) return NotFound();

        // --- บันทึก Log ลง SystemLogs ก่อนข้อมูลหาย ---
        var log = new SystemLog
        {
            UserId = 1, // TODO: ใส่ UserID คนลบจริง (ถ้ามี Auth)
            ActionType = "DELETE_LINEN",
            Description = $"ลบ {linen.RfidCode} : {linen.Product?.ProductName ?? "Unknown"}",
            CreatedAt = DateTime.UtcNow
        };
        _context.SystemLogs.Add(log);
        // -------------------------------------------

        _context.Linens.Remove(linen); // ลบจาก DB ถาวร
        await _context.SaveChangesAsync();

        return NoContent();
    }
}