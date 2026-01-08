using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequestController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public RequestController(LinenDbContext context)
        {
            _context = context;
        }

        // Helper สำหรับดึงเวลาประเทศไทย (UTC+7)
        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        // =============================================
        // 1. GET ALL
        // =============================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Request>>> GetRequests()
        {
            return await _context.Requests
                .Include(r => r.RequestItems)
                    .ThenInclude(ri => ri.Product)
                        .ThenInclude(p => p.Category)
                .Include(r => r.RequestedByUser)
                .Include(r => r.TargetWard)
                .Include(r => r.CurrentStatus)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        // =============================================
        // 2. GET BY ID
        // =============================================
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

        // =============================================
        // 3. CHECK STOCK API
        // =============================================
        [HttpGet("CheckStock/{productId}")]
        public async Task<IActionResult> GetStock(int productId)
        {
            var physicalStock = await _context.Linens
                .CountAsync(l => l.ProductId == productId && l.Status == "Available");

            var pendingStock = await _context.RequestItems
                .Where(ri => ri.ProductId == productId && ri.Request.CurrentStatusId == 1)
                .SumAsync(ri => ri.Quantity);

            var effectiveStock = physicalStock - pendingStock;
            if (effectiveStock < 0) effectiveStock = 0;

            return Ok(new { productId, available = effectiveStock });
        }

        // =============================================
        // 4. POST (สร้างคำร้อง + รันเลข + ✅ เวลาไทย)
        // =============================================
        [HttpPost]
        public async Task<ActionResult<Request>> PostRequest(Request request)
        {
            if (request.RequestItems == null || !request.RequestItems.Any())
            {
                return BadRequest(new { message = "กรุณาระบุรายการผ้าอย่างน้อย 1 รายการ" });
            }

            foreach (var item in request.RequestItems)
            {
                var physicalStock = await _context.Linens
                    .CountAsync(l => l.ProductId == item.ProductId && l.Status == "Available");

                var pendingStock = await _context.RequestItems
                    .Where(ri => ri.ProductId == item.ProductId && ri.Request.CurrentStatusId == 1)
                    .SumAsync(ri => ri.Quantity);

                var availableStock = physicalStock - pendingStock;

                if (item.Quantity > availableStock)
                {
                    return BadRequest(new 
                    { 
                        message = $"สินค้า ID {item.ProductId} มีไม่พอ! (ว่าง: {physicalStock}, รออนุมัติ: {pendingStock}, คงเหลือให้เบิก: {availableStock})" 
                    });
                }
            }
            
            // รันเลขที่เอกสาร (ใช้เวลาไทยในการเจนเลขวันที่ด้วย)
            var now = ThaiTime(); 
            var todayStr = now.ToString("yyyyMMdd");
            var prefix = $"REQ-{todayStr}-";
            
            var lastRequest = await _context.Requests
                .Where(r => r.RequestCode != null && r.RequestCode.StartsWith(prefix))
                .OrderByDescending(r => r.RequestCode)
                .FirstOrDefaultAsync();

            int nextNumber = 1;
            if (lastRequest != null)
            {
                string lastRunningStr = lastRequest.RequestCode.Substring(lastRequest.RequestCode.Length - 3);
                if (int.TryParse(lastRunningStr, out int lastRunning))
                {
                    nextNumber = lastRunning + 1;
                }
            }
                
            request.RequestCode = $"{prefix}{nextNumber.ToString("D3")}"; 
            
            // ✅ บันทึกเวลาไทย
            request.CreatedAt = now;
            request.UpdatedAt = now;
            
            if (request.CurrentStatusId == 0) request.CurrentStatusId = 1;

            _context.Requests.Add(request);

            // System Log
            var totalQty = request.RequestItems.Sum(i => i.Quantity); 
            var log = new SystemLog
            {
                UserId = request.RequestedByUserId,
                ActionType = "CREATE_REQUEST",
                Description = $"สร้างคำร้องใหม่ {request.RequestCode} (รวม {totalQty} ชิ้น)",
                CreatedAt = now // ✅ เวลาไทย
            };
            _context.SystemLogs.Add(log);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Save Error: " + msg });
            }

            return CreatedAtAction("GetRequest", new { id = request.RequestId }, request);
        }

        // =============================================
        // 5. PUT (อนุมัติ + ตัดสต็อก + ✅ เวลาไทย)
        // =============================================
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRequest(int id, Request request)
        {
            if (id != request.RequestId) return BadRequest("ID ไม่ตรงกัน");

            var existingRequest = await _context.Requests.FindAsync(id);
            if (existingRequest == null) return NotFound();

            var oldStatusId = existingRequest.CurrentStatusId;
            var newStatusId = request.CurrentStatusId;

            existingRequest.CurrentStatusId = newStatusId;
            existingRequest.UpdatedAt = ThaiTime(); // ✅ เวลาไทย

            if (newStatusId == 2 && oldStatusId != 2)
            {
                var requestItems = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                foreach (var item in requestItems)
                {
                    if (item.LinenId == null)
                    {
                        var availableLinens = await _context.Linens
                            .Where(l => l.ProductId == item.ProductId && l.Status == "Available")
                            .Take(item.Quantity)
                            .ToListAsync();

                        foreach (var linen in availableLinens)
                        {
                            linen.Status = "In Use";
                            linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย

                            _context.LinenLogs.Add(new LinenLog
                            {
                                LinenId = linen.LinenId,
                                ActivityType = "ISSUE", 
                                Description = $"อนุมัติคำร้อง {existingRequest.RequestCode} (ตัดสต็อกอัตโนมัติ)",
                                Timestamp = ThaiTime() // ✅ เวลาไทย
                            });
                        }
                    }
                    else 
                    {
                        var linen = await _context.Linens.FindAsync(item.LinenId);
                        if(linen != null) 
                        {
                            linen.Status = "In Use";
                            linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย

                            _context.LinenLogs.Add(new LinenLog
                            {
                                LinenId = item.LinenId.Value,
                                ActivityType = "ISSUE",
                                Description = $"อนุมัติคำร้อง {existingRequest.RequestCode} (ระบุชิ้น)",
                                Timestamp = ThaiTime() // ✅ เวลาไทย
                            });
                        }
                    }
                }
            }

            // System Log
            if (oldStatusId != newStatusId)
            {
                var statusText = newStatusId == 2 ? "อนุมัติ" : (newStatusId == 3 ? "ปฏิเสธ" : "รออนุมัติ");
                var log = new SystemLog
                {
                    UserId = request.RequestedByUserId,
                    ActionType = "UPDATE_STATUS",
                    Description = $"คำร้อง {existingRequest.RequestCode} ถูกเปลี่ยนสถานะเป็น '{statusText}'",
                    CreatedAt = ThaiTime() // ✅ เวลาไทย
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

        // =============================================
        // 6. DELETE (ลบ + คืนสต็อก + ✅ เวลาไทย)
        // =============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRequest(int id)
        {
            var request = await _context.Requests.FindAsync(id);
            if (request == null) return NotFound();

            if (request.CurrentStatusId == 2)
            {
                var items = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                foreach (var item in items)
                {
                   if (item.LinenId != null)
                   {
                        var linen = await _context.Linens.FindAsync(item.LinenId);
                        if (linen != null && linen.Status == "In Use")
                        {
                            linen.Status = "Available";
                            linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย
                        }
                   }
                }
            }

            var log = new SystemLog
            {
                UserId = null,
                ActionType = "DELETE_REQUEST",
                Description = $"ลบคำร้อง {request.RequestCode}",
                CreatedAt = ThaiTime() // ✅ เวลาไทย
            };
            _context.SystemLogs.Add(log);

            _context.Requests.Remove(request);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"ลบรายการ {request.RequestCode} เรียบร้อยแล้ว" });
        }

        private bool RequestExists(int id)
        {
            return _context.Requests.Any(e => e.RequestId == id);
        }
    }
}