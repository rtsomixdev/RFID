using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class RequestController : ControllerBase
{
    private readonly LinenDbContext _context;

    public RequestController(LinenDbContext context)
    {
        _context = context;
    }

    // GET: api/Request
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Request>>> GetRequests()
    {
        return await _context.Requests
            .Include(r => r.RequestItems)
                .ThenInclude(ri => ri.Product)
                    .ThenInclude(p => p.Category) // ✅ ดึงหมวดหมู่สินค้ามาโชว์ด้วย
            .Include(r => r.RequestedByUser)      // ✅ ดึงชื่อคนเบิก
            .Include(r => r.TargetWard)           // ✅ ดึงชื่อวอร์ดปลายทาง
            .Include(r => r.CurrentStatus)        // ✅ ดึงสถานะ (Pending/Approved)
            .OrderByDescending(r => r.CreatedAt)  // เรียงเอาล่าสุดขึ้นก่อน
            .ToListAsync();
    }

    // GET: api/Request/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Request>> GetRequest(int id)
    {
        var request = await _context.Requests
            .Include(r => r.RequestItems)
                .ThenInclude(ri => ri.Product)
                    .ThenInclude(p => p.Category)
            .Include(r => r.RequestedByUser)
            .Include(r => r.TargetWard)
            .Include(r => r.CurrentStatus)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null) return NotFound();

        return request;
    }

    // POST: api/Request (สร้างคำร้องใหม่)
    [HttpPost]
    public async Task<ActionResult<Request>> PostRequest(Request request)
    {
        if (request.RequestItems == null || !request.RequestItems.Any())
        {
            return BadRequest(new { message = "กรุณาระบุรายการผ้าอย่างน้อย 1 รายการ" });
        }

        // 1. สร้างเลขที่เอกสาร (Running Number) เช่น REQ-20251223-001
        var todayStr = DateTime.Now.ToString("yyyyMMdd");
        var prefix = $"REQ-{todayStr}-";
        
        // นับจำนวนของวันนี้เพื่อรันเลขต่อ
        var count = await _context.Requests
            .Where(r => r.RequestCode != null && r.RequestCode.StartsWith(prefix))
            .CountAsync(); 
            
        request.RequestCode = $"{prefix}{(count + 1).ToString("D3")}"; 
        request.CreatedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;
        
        // Default Status = 1 (Pending)
        if (request.CurrentStatusId == 0) request.CurrentStatusId = 1;

        _context.Requests.Add(request);

        // 2. คำนวณยอดรวมจำนวนผ้า (ชิ้น)
        // ✅✅✅ แก้ไขตรงนี้: ใช้ .Quantity ตามที่แก้ใน Model แล้ว
        var totalQty = request.RequestItems.Sum(i => i.Quantity); 

        // 3. บันทึก Log
        var log = new SystemLog
        {
            UserId = request.RequestedByUserId,
            ActionType = "CREATE_REQUEST",
            Description = $"สร้างคำร้องใหม่ {request.RequestCode} (รวม {totalQty} ชิ้น)",
            CreatedAt = DateTime.UtcNow
        };
        _context.SystemLogs.Add(log);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // ดัก Error ให้ละเอียดขึ้น เพื่อให้ Frontend รู้เรื่อง
            var msg = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = "Save Error: " + msg });
        }

        return CreatedAtAction("GetRequest", new { id = request.RequestId }, request);
    }

    // PUT: api/Request/5 (อัปเดตสถานะ อนุมัติ/ปฏิเสธ)
    [HttpPut("{id}")]
    public async Task<IActionResult> PutRequest(int id, Request request)
    {
        if (id != request.RequestId) return BadRequest("ID ไม่ตรงกัน");

        var existingRequest = await _context.Requests.FindAsync(id);
        if (existingRequest == null) return NotFound();

        var oldStatusId = existingRequest.CurrentStatusId;
        var newStatusId = request.CurrentStatusId;

        // อัปเดตข้อมูล
        existingRequest.CurrentStatusId = newStatusId;
        existingRequest.UpdatedAt = DateTime.UtcNow;

        // ถ้าสถานะเปลี่ยน ให้บันทึก Log
        if (oldStatusId != newStatusId)
        {
            var statusText = newStatusId == 2 ? "อนุมัติ" : (newStatusId == 3 ? "ปฏิเสธ" : "รออนุมัติ");
            
            var log = new SystemLog
            {
                UserId = request.RequestedByUserId, // หรือใส่ ID ของคนกดอนุมัติ (ถ้ามีส่งมา)
                ActionType = "UPDATE_STATUS",
                Description = $"คำร้อง {existingRequest.RequestCode} ถูกเปลี่ยนสถานะเป็น '{statusText}'",
                CreatedAt = DateTime.UtcNow
            };
            _context.SystemLogs.Add(log);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!RequestExists(id)) return NotFound();
            else throw;
        }

        return NoContent();
    }

    // DELETE: api/Request/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound();

        // Log ก่อนลบ
        var log = new SystemLog
        {
            UserId = null,
            ActionType = "DELETE_REQUEST",
            Description = $"ลบคำร้อง {request.RequestCode} ออกจากระบบ",
            CreatedAt = DateTime.UtcNow
        };
        _context.SystemLogs.Add(log);

        _context.Requests.Remove(request);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool RequestExists(int id)
    {
        return _context.Requests.Any(e => e.RequestId == id);
    }
}