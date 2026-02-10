using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    // ==========================================
    // DTOs (Data Transfer Objects)
    // ==========================================

    public class DiscardPayload
    {
        public string? RfidCode { get; set; }
        public int? ProductId { get; set; }
        public int DamageReasonId { get; set; }
        public string? Note { get; set; }
        public int ReportedByUserId { get; set; }
    }

    public class DiscardBatchDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int DamageReasonId { get; set; }
        public string? Note { get; set; }
        public int ReportedByUserId { get; set; }
    }

    public class RegisterBatchDto
    {
        public int ProductId { get; set; }
        public int HospitalId { get; set; }
        public int? VendorId { get; set; }
        public List<string> RfidCodes { get; set; } = new List<string>();
    }

    public class ScanRequestDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int? ReaderId { get; set; } 
        public string ActionType { get; set; } = "CHECK"; 
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

        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        // ✅ Helper Function: เพิ่ม Parameter from/to เพื่อบันทึก Flow
        private void CreateLinenLog(int linenId, string activity, string description, string from = "-", string to = "-")
        {
            _context.LinenLogs.Add(new LinenLog
            {
                LinenId = linenId,
                ActivityType = activity, // Add, Wash, Restock, Discard
                Description = description,
                FromLocation = from,     // ✅ ต้นทาง
                ToLocation = to,         // ✅ ปลายทาง
                CreatedAt = ThaiTime()
            });
        }

        // ==========================================
        // 🔥 0. POST: Scan Logic (Manual Check via API)
        // ==========================================
        [HttpPost("Scan")]
        public async Task<IActionResult> ScanProcess([FromBody] ScanRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest(new { message = "ไม่พบข้อมูล RFID" });

            var foundLinens = await _context.Linens
                .Include(l => l.Product)
                    .ThenInclude(p => p.Category)
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            string readerName = "Unknown Point";
            if (request.ReaderId.HasValue)
            {
                var reader = await _context.Readers.FindAsync(request.ReaderId.Value);
                if (reader != null) readerName = reader.ReaderName;
            }

            var now = ThaiTime();
            var registered = new List<object>(); 
            var disposed = new List<object>();   
            var unknown = new List<string>();    
            var invalid = new List<object>();    

            foreach (var rfid in request.RfidCodes)
            {
                var linen = foundLinens.FirstOrDefault(l => l.RfidCode == rfid);

                if (linen == null)
                {
                    unknown.Add(rfid);
                    _context.SystemLogs.Add(new SystemLog
                    {
                        ActionType = "SCAN_UNKNOWN",
                        Description = $"พบ RFID แปลกปลอม: {rfid} ที่จุด {readerName}",
                        UserId = 1, CreatedAt = now
                    });
                }
                else if (!linen.IsActive) 
                {
                    disposed.Add(new { linen.RfidCode, Status = "Disposed" });
                    _context.SystemLogs.Add(new SystemLog
                    {
                        ActionType = "SCAN_DISPOSED",
                        Description = $"พบ RFID ที่จำหน่ายแล้ว: {rfid} ที่จุด {readerName}",
                        UserId = 1, CreatedAt = now
                    });
                }
                else
                {
                    // ✅ 1. เก็บ Location เดิมไว้ก่อน
                    string prevLocation = linen.CurrentLocation ?? "-";
                    string newLocation = readerName; // Default location = จุดที่สแกน
                    string activity = "Check";

                    // ✅ 2. คำนวณ Location ใหม่ตาม Action
                    if (request.ActionType == "DISPATCH") 
                    {
                        if (linen.Status == "InTransit") 
                        {
                            invalid.Add(new { linen.RfidCode, Message = "สินค้านี้อยู่ระหว่างขนส่งแล้ว" });
                            continue;
                        }
                        linen.Status = "InTransit"; // หรือ Washing
                        activity = "Wash";
                        newLocation = "Laundry"; // ส่งไปซัก -> ปลายทางคือ Laundry
                    }
                    else if (request.ActionType == "RECEIVE")
                    {
                        if (linen.Status != "InTransit") 
                        {
                            invalid.Add(new { linen.RfidCode, Message = "ต้องส่งมาก่อนถึงจะรับได้" });
                            continue;
                        }
                        linen.Status = "Available";
                        activity = "Restock";
                        newLocation = "Stock"; // รับกลับ -> ปลายทางคือ Stock
                    }
                    else 
                    {
                        // แค่เช็คของ (Check)
                        linen.CurrentLocation = readerName;
                    }

                    // ✅ 3. อัปเดตค่าจริง
                    linen.CurrentLocation = newLocation;
                    linen.UpdatedAt = now;

                    // ✅ 4. บันทึก Log พร้อม Flow (From -> To)
                    CreateLinenLog(linen.LinenId, activity, $"สแกนที่จุด {readerName}", prevLocation, newLocation);

                    bool isExpired = linen.WashCount >= linen.MaxWashCount;
                    registered.Add(new 
                    {
                        linen.LinenId,
                        linen.RfidCode,
                        ProductName = linen.Product?.ProductName ?? "Unknown",
                        Category = linen.Product?.Category?.CategoryName ?? "-",
                        Status = linen.Status,
                        linen.WashCount,
                        linen.MaxWashCount,
                        IsExpired = isExpired,
                        linen.CurrentLocation
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new 
            {
                TotalScanned = request.RfidCodes.Count,
                Registered = registered,
                Unknown = unknown,
                Disposed = disposed,
                Invalid = invalid 
            });
        }

        // ==========================================
        // 1. GET: GetLinens
        // ==========================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Linen>>> GetLinens()
        {
            return await _context.Linens
                .Include(l => l.Product)
                    .ThenInclude(p => p.Category)
                .Include(l => l.Hospital)
                .Where(l => l.IsActive == true)
                .OrderByDescending(l => l.RegisteredAt)
                .ToListAsync();
        }

        // ==========================================
        // 2. GET: DiscardHistory
        // ==========================================
        [HttpGet("DiscardHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardHistory()
        {
            var history = await _context.Linens
                .Include(l => l.Product)
                .Where(l => l.IsActive == false && l.Status != "Available")
                .OrderByDescending(l => l.UpdatedAt)
                .Take(50)
                .Select(l => new 
                {
                    id = l.LinenId,
                    item = l.Product != null ? l.Product.ProductName : ("RFID: " + l.RfidCode), 
                    reason = l.Status,
                    time = l.UpdatedAt.HasValue ? l.UpdatedAt.Value.ToString("dd/MM/yy HH:mm") : "-"
                })
                .ToListAsync();

            return Ok(history);
        }

        // ==========================================
        // 3. GET: DeleteHistory
        // ==========================================
        [HttpGet("DeleteHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDeleteHistory()
        {
            var logs = await _context.SystemLogs
                .Where(x => x.ActionType.Contains("DELETE") || x.ActionType.Contains("DISCARD"))
                .OrderByDescending(x => x.CreatedAt)
                .Take(20)
                .Select(x => new 
                {
                    id = x.LogId,
                    item = x.Description,
                    time = x.CreatedAt.ToString("dd/MM/yy HH:mm")
                })
                .ToListAsync();

            return Ok(logs);
        }

        // ==========================================
        // 4. GET: Monitor
        // ==========================================
        [HttpGet("Monitor/Latest")]
        public async Task<IActionResult> GetLatestMonitor()
        {
            try 
            {
                var recentLinens = await _context.Linens
                    .Include(l => l.Product)
                    .Where(l => l.IsActive == true)
                    .OrderByDescending(l => l.UpdatedAt)
                    .Take(30) 
                    .ToListAsync();

                var recentUnknowns = await _context.SystemLogs
                    .Where(x => x.ActionType == "SCAN_UNKNOWN" || x.ActionType == "SCAN_DISPOSED")
                    .OrderByDescending(x => x.CreatedAt)
                    .Take(10)
                    .ToListAsync();

                var result = new List<object>();

                foreach (var l in recentLinens)
                {
                    result.Add(new 
                    {
                        rfid = l.RfidCode ?? "-",
                        productName = l.Product?.ProductName ?? "Unknown Product",
                        location = l.CurrentLocation ?? "ไม่ระบุ", 
                        status = l.Status ?? "Unknown",
                        updatedAt = l.UpdatedAt
                    });
                }

                foreach (var log in recentUnknowns)
                {
                    string rfid = "Unknown";
                    string loc = "Unknown Point";
                    string status = log.ActionType == "SCAN_DISPOSED" ? "Disposed" : "Alien";

                    try 
                    {
                        if (!string.IsNullOrEmpty(log.Description))
                        {
                            var parts = log.Description.Split(':');
                            if (parts.Length > 1) 
                            {
                                var subParts = parts[1].Trim().Split(' ');
                                rfid = subParts[0]; 
                            }

                            if (log.Description.Contains("ที่จุด")) 
                            {
                                var locParts = log.Description.Split(new[] { "ที่จุด" }, StringSplitOptions.None);
                                if (locParts.Length > 1) loc = locParts[1].Trim();
                            }
                        }
                    } 
                    catch { rfid = "Parse Error"; }

                    result.Add(new 
                    {
                        rfid = rfid,
                        productName = status == "Disposed" ? "จำหน่ายแล้ว" : "ไม่พบในระบบ", 
                        location = loc,
                        status = status,
                        updatedAt = log.CreatedAt 
                    });
                }

                return Ok(result.OrderByDescending(x => ((dynamic)x).updatedAt));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server Error", error = ex.Message });
            }
        }

        // ==========================================
        // 5. POST: Discard (รายชิ้น)
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

                    // ✅ เก็บ Location เดิม
                    string prevLoc = linen.CurrentLocation ?? "-";

                    linen.IsActive = false; 
                    linen.Status = reasonName;
                    linen.UpdatedAt = ThaiTime(); 

                    // ✅ Log Flow: จากที่เดิม -> Disposal
                    CreateLinenLog(linen.LinenId, "Discard", $"แจ้งชำรุด: {reasonName}", prevLoc, "Disposal");
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
        // 6. POST: PostLinen (เพิ่มทีละชิ้น)
        // ==========================================
        [HttpPost]
        public async Task<ActionResult<Linen>> PostLinen(Linen linen)
        {
            var exists = await _context.Linens.AnyAsync(l => l.RfidCode == linen.RfidCode);
            if (exists) return BadRequest(new { message = $"RFID {linen.RfidCode} มีอยู่แล้ว" });

            linen.RegisteredAt = ThaiTime();
            linen.UpdatedAt = ThaiTime();
            linen.IsActive = true;
            linen.Status = "Available"; 
            linen.WashCount = 0; 
            linen.CurrentLocation = "Stock";
            
            _context.Linens.Add(linen);
            await _context.SaveChangesAsync(); 

            // ✅ Log Flow: จาก "-" (ไม่มี) -> Stock
            CreateLinenLog(linen.LinenId, "Add", "เพิ่มรายชิ้น", "-", "Stock");
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetLinens", new { id = linen.LinenId }, linen);
        }

        // ==========================================
        // 7. POST: RegisterBatch (เพิ่มทีละหลายชิ้น)
        // ==========================================
        [HttpPost("RegisterBatch")]
        public async Task<IActionResult> RegisterBatch([FromBody] RegisterBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาสแกน RFID อย่างน้อย 1 รายการ");

            var existingRfids = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .Select(l => l.RfidCode)
                .ToListAsync();

            if (existingRfids.Any())
            {
                return BadRequest(new { 
                    message = $"พบ RFID ซ้ำในระบบ: {string.Join(", ", existingRfids)}",
                    duplicates = existingRfids 
                });
            }

            var newLinens = new List<Linen>();
            var now = ThaiTime();

            foreach (var rfid in request.RfidCodes)
            {
                newLinens.Add(new Linen
                {
                    RfidCode = rfid,
                    ProductId = request.ProductId,
                    HospitalId = request.HospitalId,
                    VendorId = request.VendorId,
                    Status = "Available",
                    IsActive = true,
                    WashCount = 0,
                    MaxWashCount = 100, 
                    CurrentLocation = "Stock",
                    RegisteredAt = now,
                    UpdatedAt = now
                });
            }

            await _context.Linens.AddRangeAsync(newLinens);
            await _context.SaveChangesAsync(); 

            // ✅ Log Flow สำหรับ Batch: จาก "-" -> "Stock"
            foreach (var item in newLinens)
            {
                CreateLinenLog(item.LinenId, "Add", "ลงทะเบียนใหม่ (Batch)", "-", "Stock");
            }
            await _context.SaveChangesAsync(); 

            return Ok(new { message = $"ลงทะเบียนสำเร็จ {newLinens.Count} รายการ" });
        }
        
        // ==========================================
        // 8. DELETE: DeleteLinen
        // ==========================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLinen(int id)
        {
            var linen = await _context.Linens
                .Include(l => l.Product)
                .FirstOrDefaultAsync(l => l.LinenId == id);

            if (linen == null) return NotFound();

            var log = new SystemLog
            {
                UserId = 1, 
                ActionType = "DELETE_LINEN",
                Description = $"ลบถาวร {linen.RfidCode} : {linen.Product?.ProductName ?? "Unknown"}",
                CreatedAt = ThaiTime()
            };
            _context.SystemLogs.Add(log);

            _context.Linens.Remove(linen);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ==========================================
        // 9. POST: DiscardBatch
        // ==========================================
        [HttpPost("DiscardBatch")]
        public async Task<IActionResult> DiscardBatch([FromBody] DiscardBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาระบุรายการ RFID");

            var reasonName = "Damaged";
            var reason = await _context.DamageReasons.FindAsync(request.DamageReasonId);
            if (reason != null) reasonName = reason.ReasonName;

            var linens = await _context.Linens
                .Include(l => l.Product)
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบรายการ RFID ในระบบ");

            var now = ThaiTime();

            foreach (var linen in linens)
            {
                // ✅ เก็บ Location เดิม
                string prevLoc = linen.CurrentLocation ?? "-";

                linen.IsActive = false; 
                linen.Status = reasonName;
                linen.UpdatedAt = now;

                _context.SystemLogs.Add(new SystemLog 
                {
                    UserId = request.ReportedByUserId,
                    ActionType = "DISCARD_BATCH",
                    Description = $"แจ้งชำรุด {linen.RfidCode} : {linen.Product?.ProductName} ({reasonName})",
                    CreatedAt = now
                });

                // ✅ Log Flow: จากที่เดิม -> Disposal
                CreateLinenLog(linen.LinenId, "Discard", $"แจ้งชำรุด: {reasonName}", prevLoc, "Disposal");
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"บันทึกแจ้งชำรุดเรียบร้อย {linens.Count} รายการ" });
        }

        // ==========================================
        // 10. POST: DeleteBatch
        // ==========================================
        [HttpPost("DeleteBatch")]
        public async Task<IActionResult> DeleteBatch([FromBody] List<string> rfidCodes)
        {
            if (rfidCodes == null || !rfidCodes.Any()) return BadRequest("กรุณาระบุ RFID");

            var linens = await _context.Linens
                .Include(l => l.Product)
                .Where(l => rfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบรายการ");

            var now = ThaiTime();

            var logs = linens.Select(l => new SystemLog
            {
                UserId = 1,
                ActionType = "DELETE_BATCH",
                Description = $"ลบถาวร {l.RfidCode} : {l.Product?.ProductName ?? "Unknown"}",
                CreatedAt = now
            });
            await _context.SystemLogs.AddRangeAsync(logs);

            _context.Linens.RemoveRange(linens);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"ลบข้อมูลถาวรเรียบร้อย {linens.Count} รายการ" });
        }

        // ==========================================
        // 11. GET: GetDiscardCandidates
        // ==========================================
        [HttpGet("Candidates/Discard")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardCandidates()
        {
            var candidates = await _context.Linens
                .Include(l => l.Product)
                .Where(l => l.IsActive == true) 
                .Select(l => new {
                    l.RfidCode,
                    ProductName = l.Product.ProductName ?? "Unknown",
                    l.Status
                })
                .ToListAsync();

            return Ok(candidates);
        }

        // ==========================================
        // 📊 12. GET: Dashboard Stats
        // ==========================================
        [HttpGet("Dashboard/Stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var now = ThaiTime();
            var today = now.Date;

            var total = await _context.Linens.CountAsync(l => l.IsActive == true);

            var newToday = await _context.Linens
                .CountAsync(l => l.IsActive == true && l.RegisteredAt.Date == today);

            var washing = await _context.Linens.CountAsync(l => l.IsActive == true && l.Status == "Washing");

            var available = await _context.Linens.CountAsync(l => l.IsActive == true && l.Status == "Available");

            var inUse = await _context.Linens.CountAsync(l => l.IsActive == true && (l.Status == "In Use" || l.Status == "InTransit"));

            return Ok(new 
            {
                TotalLinens = total,
                NewLinensToday = newToday,
                Washing = washing,
                Available = available,
                InUse = inUse
            });
        }
    }
}