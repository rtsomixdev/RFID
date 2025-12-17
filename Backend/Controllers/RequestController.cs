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
            .Include(r => r.RequestedByUser)
            .Include(r => r.TargetWard)
            .Include(r => r.CurrentStatus)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    // GET: api/Request/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Request>> GetRequest(int id)
    {
        var request = await _context.Requests
            .Include(r => r.RequestItems)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null) return NotFound();

        return request;
    }

    // POST: api/Request (สร้างใบเบิก + Log)
    [HttpPost]
    public async Task<ActionResult<Request>> PostRequest(Request request)
    {
        // 1. สร้างเลขที่เอกสาร
        var todayStr = DateTime.Now.ToString("yyyyMMdd");
        var prefix = $"REQ-{todayStr}-";
        
        var count = await _context.Requests
            .Where(r => r.RequestCode != null && r.RequestCode.StartsWith(prefix))
            .CountAsync();
            
        request.RequestCode = $"{prefix}{(count + 1).ToString("D3")}"; 
        request.CreatedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;
        
        if (request.CurrentStatusId == 0) request.CurrentStatusId = 1;

        // 2. เพิ่มข้อมูลลง DbContext
        _context.Requests.Add(request);

        // 3. ✅✅✅ บันทึก Log: สร้างคำร้องใหม่
        var log = new SystemLog
        {
            UserId = request.RequestedByUserId,
            ActionType = "CREATE_REQUEST",
            Description = $"สร้างคำร้องใหม่ {request.RequestCode} (ประเภท: {(request.RequestType == 1 ? "เบิกผ้า" : "เปลี่ยนผ้า")})",
            CreatedAt = DateTime.UtcNow
        };
        _context.SystemLogs.Add(log);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
             return StatusCode(500, new { message = "Save Error: " + ex.InnerException?.Message ?? ex.Message });
        }

        return CreatedAtAction("GetRequest", new { id = request.RequestId }, request);
    }

    // PUT: api/Request/5 (อัปเดตสถานะ + Log)
    [HttpPut("{id}")]
    public async Task<IActionResult> PutRequest(int id, Request request)
    {
        if (id != request.RequestId) return BadRequest("ID ไม่ตรงกัน");

        var existingRequest = await _context.Requests.FindAsync(id);
        if (existingRequest == null) return NotFound();

        // เช็คก่อนว่าสถานะเปลี่ยนไหม เพื่อบันทึก Log ให้ถูกต้อง
        var oldStatusId = existingRequest.CurrentStatusId;
        var newStatusId = request.CurrentStatusId;

        existingRequest.CurrentStatusId = newStatusId;
        existingRequest.UpdatedAt = DateTime.UtcNow;

        // ✅✅✅ บันทึก Log: อัปเดตสถานะ
        if (oldStatusId != newStatusId)
        {
            var statusText = newStatusId == 2 ? "อนุมัติ" : (newStatusId == 3 ? "ปฏิเสธ" : "รออนุมัติ");
            var log = new SystemLog
            {
                UserId = null, // ถ้า Frontend ส่ง AdminId มาด้วยจะดีมาก (ตอนนี้ใส่ null ไปก่อน)
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

    // DELETE: api/Request/5 (ลบคำร้อง + Log)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null) return NotFound();

        // ✅✅✅ บันทึก Log: ลบคำร้อง (ต้องทำก่อน Remove เพราะถ้าลบแล้วจะดึงข้อมูลมา Log ไม่ได้)
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