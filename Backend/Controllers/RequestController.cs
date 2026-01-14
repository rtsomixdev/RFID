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
                .Include(r => r.TargetWard) // ✅ Include ปลายทาง
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
            // นับเฉพาะผ้าที่ Available และ Active
            var physicalStock = await _context.Linens
                .CountAsync(l => l.ProductId == productId && l.Status == "Available" && l.IsActive == true);

            // หักลบยอดที่รออนุมัติอยู่ (StatusId = 1)
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

            // --- 1. เช็คสต็อกก่อนบันทึก ---
            foreach (var item in request.RequestItems)
            {
                var physicalStock = await _context.Linens
                    .CountAsync(l => l.ProductId == item.ProductId && l.Status == "Available" && l.IsActive == true);

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
            
            // --- 2. รันเลขที่เอกสาร ---
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
            
            // --- 3. Set ค่าเริ่มต้น ---
            request.CreatedAt = now;
            request.UpdatedAt = now;
            if (request.CurrentStatusId == 0) request.CurrentStatusId = 1; // 1 = Pending
            request.Status = "Pending"; // อัปเดต Text Status ด้วย

            // บันทึก RequestType และ TargetWardId (ถ้ามีส่งมาจะถูก map อัตโนมัติ)
            // เช็ค Note นิดหน่อย
            if (string.IsNullOrEmpty(request.Note)) request.Note = "-";

            _context.Requests.Add(request);

            // --- 4. System Log ---
            var totalQty = request.RequestItems.Sum(i => i.Quantity); 
            var log = new SystemLog
            {
                UserId = request.RequestedByUserId,
                ActionType = "CREATE_REQUEST",
                Description = $"สร้างคำร้องใหม่ {request.RequestCode} (รวม {totalQty} ชิ้น) ไปยัง Ward ID: {request.TargetWardId}",
                CreatedAt = now 
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
            // อัปเดต Status String ตาม ID เพื่อความชัวร์
            existingRequest.Status = newStatusId == 2 ? "Approved" : (newStatusId == 99 ? "Cancelled" : "Pending");
            existingRequest.UpdatedAt = ThaiTime(); 

            // กรณีเปลี่ยนเป็น Approved (2) -> ตัดสต็อก (เปลี่ยน Linen เป็น In Use)
            if (newStatusId == 2 && oldStatusId != 2)
            {
                var requestItems = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                foreach (var item in requestItems)
                {
                    if (item.LinenId == null) // กรณีระบุแค่จำนวน (ตัด Auto)
                    {
                        var availableLinens = await _context.Linens
                            .Where(l => l.ProductId == item.ProductId && l.Status == "Available" && l.IsActive == true)
                            .Take(item.Quantity)
                            .ToListAsync();

                        foreach (var linen in availableLinens)
                        {
                            linen.Status = "In Use";
                            linen.CurrentLocation = "In Use"; // อัปเดต Location
                            linen.UpdatedAt = ThaiTime();

                            _context.LinenLogs.Add(new LinenLog
                            {
                                LinenId = linen.LinenId,
                                ActivityType = "ISSUE", 
                                Description = $"อนุมัติคำร้อง {existingRequest.RequestCode} (Auto)",
                                Timestamp = ThaiTime()
                            });
                        }
                    }
                    else // กรณีระบุชิ้น (LinenId) มาแล้ว
                    {
                        var linen = await _context.Linens.FindAsync(item.LinenId);
                        if(linen != null) 
                        {
                            linen.Status = "In Use";
                            linen.CurrentLocation = "In Use";
                            linen.UpdatedAt = ThaiTime();

                            _context.LinenLogs.Add(new LinenLog
                            {
                                LinenId = item.LinenId.Value,
                                ActivityType = "ISSUE",
                                Description = $"อนุมัติคำร้อง {existingRequest.RequestCode} (Specific)",
                                Timestamp = ThaiTime()
                            });
                        }
                    }
                }
            }

            // System Log
            if (oldStatusId != newStatusId)
            {
                var statusText = newStatusId == 2 ? "อนุมัติ" : (newStatusId == 99 ? "ยกเลิก" : "รออนุมัติ");
                var log = new SystemLog
                {
                    UserId = request.RequestedByUserId, // ควรเป็น ID คนกดอนุมัติ แต่ใช้ RequestedBy ไปก่อนถ้าไม่มี
                    ActionType = "UPDATE_STATUS",
                    Description = $"คำร้อง {existingRequest.RequestCode} ถูกเปลี่ยนสถานะเป็น '{statusText}'",
                    CreatedAt = ThaiTime()
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
        // 6. DELETE (เปลี่ยนเป็น CANCEL / ยกเลิกคำร้อง)
        // 🔥 แก้ไขตาม Req: ห้ามลบจริง ให้เปลี่ยนสถานะเป็น Cancelled
        // =============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelRequest(int id)
        {
            var request = await _context.Requests.FindAsync(id);
            if (request == null) return NotFound();

            // ถ้าเคยอนุมัติไปแล้ว (Status = 2) ต้องคืนของเข้าระบบก่อน
            if (request.CurrentStatusId == 2)
            {
                var items = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                foreach (var item in items)
                {
                   // คืนสต็อกเฉพาะที่เคยตัดไป (Logic อาจต้องซับซ้อนกว่านี้ถ้ามีการระบุชิ้น แต่เบื้องต้นคืน Available)
                   if (item.LinenId != null)
                   {
                        var linen = await _context.Linens.FindAsync(item.LinenId);
                        if (linen != null && linen.Status == "In Use")
                        {
                            linen.Status = "Available";
                            linen.CurrentLocation = "Stock"; // คืนเข้า Stock
                            linen.UpdatedAt = ThaiTime();
                        }
                   }
                }
            }

            // เปลี่ยนสถานะเป็น Cancelled (สมมติให้ 99 = Cancelled)
            request.CurrentStatusId = 99; 
            request.Status = "Cancelled";
            request.UpdatedAt = ThaiTime();

            // Log การยกเลิก
            var log = new SystemLog
            {
                UserId = null,
                ActionType = "CANCEL_REQUEST", // เปลี่ยนจาก DELETE เป็น CANCEL
                Description = $"ยกเลิกคำร้อง {request.RequestCode}",
                CreatedAt = ThaiTime()
            };
            _context.SystemLogs.Add(log);

            // บันทึกการเปลี่ยนแปลง (ไม่มีการ .Remove() แล้ว)
            await _context.SaveChangesAsync();

            return Ok(new { message = $"ยกเลิกคำร้อง {request.RequestCode} เรียบร้อยแล้ว (สถานะเป็น Cancelled)" });
        }

        private bool RequestExists(int id)
        {
            return _context.Requests.Any(e => e.RequestId == id);
        }
    }
}