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
            // นับของจริงที่สถานะพร้อมใช้ (รวมภาษาไทย)
            var physicalStock = await _context.Linens
                .CountAsync(l => l.ProductId == productId && l.IsActive == true && 
                                (l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"));

            // หักลบยอดที่ "รออนุมัติ" (จองไว้แล้ว)
            var pendingStock = await _context.RequestItems
                .Where(ri => ri.ProductId == productId && (ri.Request.CurrentStatusId == 1 || ri.Request.Status == "Pending"))
                .SumAsync(ri => ri.QuantityRequested); 

            var effectiveStock = physicalStock - pendingStock;
            if (effectiveStock < 0) effectiveStock = 0;

            return Ok(new { productId, available = effectiveStock });
        }

        // =============================================
        // 4. POST (สร้างคำร้อง)
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
                    .CountAsync(l => l.ProductId == item.ProductId && l.IsActive == true && 
                                    (l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"));

                var pendingStock = await _context.RequestItems
                    .Where(ri => ri.ProductId == item.ProductId && (ri.Request.CurrentStatusId == 1 || ri.Request.Status == "Pending"))
                    .SumAsync(ri => ri.QuantityRequested); 

                var availableStock = physicalStock - pendingStock;

                if (item.QuantityRequested > availableStock)
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
            request.Status = "Pending";

            if (string.IsNullOrEmpty(request.Note)) request.Note = "-";

            _context.Requests.Add(request);

            // --- 4. System Log ---
            var totalQty = request.RequestItems.Sum(i => i.QuantityRequested); 
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
        // 5. PUT (อนุมัติ + ตัดสต็อกอัตโนมัติ)
        // =============================================
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRequest(int id, Request request)
        {
            if (id != request.RequestId) return BadRequest("ID ไม่ตรงกัน");

            // ✅ Include TargetWard เพื่อให้ดึงชื่อวอร์ดเป้าหมายไปอัปเดตใส่ Location ได้
            var existingRequest = await _context.Requests
                .Include(r => r.TargetWard)
                .FirstOrDefaultAsync(r => r.RequestId == id);
                
            if (existingRequest == null) return NotFound();

            var oldStatusId = existingRequest.CurrentStatusId;
            var newStatusId = request.CurrentStatusId;

            existingRequest.CurrentStatusId = newStatusId;
            // แมป Status ให้ตรงกับ 1=Pending, 2=Approved, 3=Rejected, 4=Dispatched
            existingRequest.Status = newStatusId switch
            {
                1 => "Pending",
                2 => "Approved",
                3 => "Rejected",
                4 => "Dispatched",
                _ => "Unknown"
            };
            existingRequest.UpdatedAt = ThaiTime(); 

            string targetWardName = existingRequest.TargetWard?.WardName ?? "ไม่ระบุแผนก";

            // กรณีเปลี่ยนเป็น Approved (2) -> ตัดสต็อก (เปลี่ยน Linen เป็น "ถูกใช้งาน")
            if (newStatusId == 2 && oldStatusId != 2)
            {
                var requestItems = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                // ✅ ดึงค่าขั้นต่ำจากตาราง Settings (ถ้าไม่มีให้ใช้ 20)
                var minStockSetting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == "GlobalMinStock");
                int minStockLevel = 20;
                if (minStockSetting != null && int.TryParse(minStockSetting.Value, out int parsedValue))
                {
                    minStockLevel = parsedValue;
                }

                foreach (var item in requestItems)
                {
                    // เตรียม Query หาของในสต็อกที่ Available
                    var availableLinensQuery = _context.Linens
                        .Where(l => l.ProductId == item.ProductId && l.IsActive == true && 
                                   (l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"));

                    var totalAvailable = await availableLinensQuery.CountAsync();

                    // เช็คว่าของพอไหม (กันเหนียวอีกรอบ)
                    if (totalAvailable < item.QuantityRequested)
                    {
                        return BadRequest(new { message = $"สินค้า ID {item.ProductId} มีไม่พอสำหรับการอนุมัติ (ต้องการ {item.QuantityRequested}, พบ {totalAvailable})" });
                    }

                    // ตัดของออกตามจำนวน
                    var availableLinens = await availableLinensQuery
                        .Take(item.QuantityRequested) 
                        .ToListAsync();

                    foreach (var linen in availableLinens)
                    {
                        string previousLocation = linen.CurrentLocation ?? "คลังผ้าสะอาด";

                        // ✅ เปลี่ยนสถานะและสถานที่ให้เป็นภาษาไทย ตาม Master Data
                        linen.Status = "ถูกใช้งาน"; 
                        linen.CurrentLocation = targetWardName; 
                        linen.UpdatedAt = ThaiTime();

                        _context.LinenLogs.Add(new LinenLog
                        {
                            LinenId = linen.LinenId,
                            ActivityType = "Dispatch", // ใช้ Dispatch จะได้แปลในหน้าเว็บเป็น "เบิกจ่าย"
                            Description = $"จ่ายผ้าตามคำร้อง {existingRequest.RequestCode}",
                            FromLocation = previousLocation,
                            ToLocation = targetWardName,
                            Timestamp = ThaiTime(),
                            CreatedAt = ThaiTime()
                        });
                    }

                    // =========================================================
                    // ✅ แจ้งเตือนเมื่อสต็อกต่ำกว่ากำหนด (Low Stock Alert)
                    // =========================================================
                    var remainingStock = totalAvailable - item.QuantityRequested;
                    if (remainingStock <= minStockLevel)
                    {
                        var productInfo = await _context.Products.FindAsync(item.ProductId);
                        string pName = productInfo?.ProductName ?? "ไม่ทราบชื่อสินค้า";

                        var noti = new Notification
                        {
                            RoleId = 1, // 1 = แจ้งเตือนไปที่ Role Admin
                            Title = "⚠️ แจ้งเตือนสต็อกผ้าต่ำ",
                            Message = $"ผ้า {pName} คงเหลือ {remainingStock} ชิ้น (ต่ำกว่าเกณฑ์ที่กำหนด {minStockLevel} ชิ้น)",
                            Type = "WARNING",
                            IsRead = false,
                            LinkUrl = "/linen", // ลิงก์ไปหน้าจัดการผ้า
                            CreatedAt = ThaiTime()
                        };
                        _context.Notifications.Add(noti);
                    }
                    // =========================================================
                }
            }

            // System Log
            if (oldStatusId != newStatusId)
            {
                string statusText = newStatusId switch
                {
                    2 => "อนุมัติ",
                    3 => "ปฏิเสธ",
                    4 => "จัดส่งเรียบร้อย",
                    _ => "รออนุมัติ"
                };

                var log = new SystemLog
                {
                    UserId = request.RequestedByUserId, 
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
        // =============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelRequest(int id)
        {
            var request = await _context.Requests.FindAsync(id);
            if (request == null) return NotFound();

            // ถ้าเคยอนุมัติไปแล้ว (Status = 2 หรือ 4) ต้องคืนของเข้าระบบ
            if (request.CurrentStatusId == 2 || request.CurrentStatusId == 4)
            {
                var items = await _context.RequestItems
                    .Where(ri => ri.RequestId == id)
                    .ToListAsync();

                foreach (var item in items)
                {
                    // หาผ้าที่เป็น Product เดียวกัน และสถานะ In Use (LIFO - คืนตัวล่าสุดที่เพิ่งเบิกไป)
                    var linensToReturn = await _context.Linens
                        .Where(l => l.ProductId == item.ProductId && (l.Status == "In Use" || l.Status == "ถูกใช้งาน"))
                        .OrderByDescending(l => l.UpdatedAt) 
                        .Take(item.QuantityRequested) 
                        .ToListAsync();

                    foreach (var linen in linensToReturn)
                    {
                        string previousLocation = linen.CurrentLocation ?? "ไม่ระบุ";

                        linen.Status = "พร้อมใช้"; // คืนสถานะภาษาไทย
                        linen.CurrentLocation = "คลังผ้าสะอาด";
                        linen.UpdatedAt = ThaiTime();

                        _context.LinenLogs.Add(new LinenLog
                        {
                            LinenId = linen.LinenId,
                            ActivityType = "RETURN_STOCK",
                            Description = $"ยกเลิกคำร้อง {request.RequestCode} (คืนสต็อก)",
                            FromLocation = previousLocation,
                            ToLocation = "คลังผ้าสะอาด",
                            Timestamp = ThaiTime(),
                            CreatedAt = ThaiTime()
                        });
                    }
                }
            }

            // เปลี่ยนสถานะเป็น Cancelled (99)
            request.CurrentStatusId = 99; // ใช้ 99 แทนการลบ
            request.Status = "Cancelled";
            request.UpdatedAt = ThaiTime();

            // Log การยกเลิก
            var log = new SystemLog
            {
                UserId = request.RequestedByUserId,
                ActionType = "CANCEL_REQUEST", 
                Description = $"ยกเลิกคำร้อง {request.RequestCode}",
                CreatedAt = ThaiTime()
            };
            _context.SystemLogs.Add(log);

            await _context.SaveChangesAsync();

            return Ok(new { message = $"ยกเลิกคำร้อง {request.RequestCode} เรียบร้อยแล้ว (สถานะเป็น Cancelled)" });
        }

        private bool RequestExists(int id)
        {
            return _context.Requests.Any(e => e.RequestId == id);
        }
    }
}