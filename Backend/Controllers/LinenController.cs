using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    // Class สำหรับรับข้อมูล Body เวลาแจ้งชำรุด (ทีละชิ้น)
    public class DiscardPayload
    {
        public string? RfidCode { get; set; }
        public int? ProductId { get; set; }
        public int DamageReasonId { get; set; }
        public string? Note { get; set; }
        public int ReportedByUserId { get; set; }
    }

    // DTO สำหรับรับข้อมูลแจ้งชำรุดแบบกลุ่ม (Batch)
    public class DiscardBatchDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int DamageReasonId { get; set; }
        public string? Note { get; set; }
        public int ReportedByUserId { get; set; }
    }

    // DTO สำหรับลงทะเบียนแบบกลุ่ม (Batch)
    public class RegisterBatchDto
    {
        public int ProductId { get; set; }
        public int HospitalId { get; set; }
        public int? VendorId { get; set; }
        public List<string> RfidCodes { get; set; } = new List<string>();
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

        // Helper สำหรับดึงเวลาประเทศไทย (ใช้ตอนบันทึก)
        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        // ==========================================
        // 1. GET: ดึงรายการผ้าที่ยัง Active
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
        // 2. GET: ดึงประวัติการแจ้งชำรุด (Discard History)
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
                    // ✅ แก้ไข: แสดงเวลาตามจริงจาก DB (ไม่บวกซ้ำ)
                    time = l.UpdatedAt.HasValue ? l.UpdatedAt.Value.ToString("dd/MM/yy HH:mm") : "-"
                })
                .ToListAsync();

            return Ok(history);
        }

        // ==========================================
        // 3. GET: ดึงประวัติรวม (แจ้งชำรุด + ลบถาวร)
        // ==========================================
        [HttpGet("DeleteHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDeleteHistory()
        {
            var logs = await _context.SystemLogs
                // 🔥 แก้ไข: ดึง Log ที่มีคำว่า DELETE หรือ DISCARD (แจ้งชำรุด)
                .Where(x => x.ActionType.Contains("DELETE") || x.ActionType.Contains("DISCARD"))
                .OrderByDescending(x => x.CreatedAt)
                .Take(20)
                .Select(x => new 
                {
                    id = x.LogId,
                    item = x.Description, // ข้อความนี้จะถูกบันทึกมาพร้อมคำนำหน้าแล้ว
                    time = x.CreatedAt.ToString("dd/MM/yy HH:mm")
                })
                .ToListAsync();

            return Ok(logs);
        }

        // ==========================================
        // 4. GET: Monitor (Latest 50 Items)
        // ==========================================
        [HttpGet("Monitor/Latest")]
        public async Task<IActionResult> GetLatestMonitor()
        {
            var recentItems = await _context.Linens
                .Include(l => l.Product)
                .OrderByDescending(l => l.UpdatedAt)
                .Take(50) 
                .ToListAsync();

            if (!recentItems.Any()) return Ok(new List<object>()); 

            var result = recentItems.Select(l => 
            {
                string loc = "จุดรับผ้าเปื้อน (Dirty Zone)"; 
                if (l.Status == "Available") loc = "คลังผ้าสะอาด (Clean Stock)";
                else if (l.Status == "Washing") loc = "ร้านซักรีด (Laundry)";
                else if (l.Status != "Available") loc = "ห้องคัดแยกชำรุด";

                return new 
                {
                    rfid = l.RfidCode,
                    productName = l.Product?.ProductName ?? "Unknown",
                    location = loc, 
                    status = l.Status,
                    timestamp = l.UpdatedAt.HasValue 
                        ? l.UpdatedAt.Value.ToString("HH:mm:ss") 
                        : "-"
                };
            });

            return Ok(result);
        }

        // ==========================================
        // 5. POST: แจ้งชำรุด (Discard - ทีละชิ้น)
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

                    linen.IsActive = false;
                    linen.Status = reasonName;
                    linen.UpdatedAt = ThaiTime(); 
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
        // 6. POST: เพิ่มผ้าใหม่ทีละชิ้น (Manual Register)
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

            _context.Linens.Add(linen);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetLinens", new { id = linen.LinenId }, linen);
        }

        // ==========================================
        // 7. POST: เพิ่มผ้าใหม่แบบกลุ่ม (Batch Register)
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
                    RegisteredAt = now,
                    UpdatedAt = now
                });
            }

            await _context.Linens.AddRangeAsync(newLinens);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"ลงทะเบียนสำเร็จ {newLinens.Count} รายการ" });
        }
        
        // ==========================================
        // 8. DELETE: ลบถาวร (Hard Delete - ทีละชิ้น)
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
        // 9. POST: แจ้งชำรุดแบบกลุ่ม (Batch Discard) - แก้ไขให้บันทึก Log
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
                .Include(l => l.Product) // Include เพื่อเอาชื่อไปลง Log
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบรายการ RFID ในระบบ");

            var now = ThaiTime();

            foreach (var linen in linens)
            {
                linen.IsActive = false;
                linen.Status = reasonName;
                linen.UpdatedAt = now;

                // 🔥 เพิ่ม: บันทึก Log การแจ้งชำรุด ลง SystemLogs
                _context.SystemLogs.Add(new SystemLog 
                {
                    UserId = request.ReportedByUserId,
                    ActionType = "DISCARD_BATCH",
                    // เขียนคำว่า "แจ้งชำรุด" ลงไปเลย
                    Description = $"แจ้งชำรุด {linen.RfidCode} : {linen.Product?.ProductName} ({reasonName})",
                    CreatedAt = now
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"บันทึกแจ้งชำรุดเรียบร้อย {linens.Count} รายการ" });
        }

        // ==========================================
        // 10. POST: ลบถาวรแบบกลุ่ม (Batch Delete)
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

            // สร้าง Log ก่อนลบ (ใช้คำว่า "ลบถาวร")
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
        // 11. GET: ดึงรายการผ้าสำหรับ Dropdown หน้า Discard
        // ==========================================
        [HttpGet("Candidates/Discard")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardCandidates()
        {
            // ดึงเฉพาะผ้าที่ยัง Active (ยังไม่ถูกตัดจำหน่าย)
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
        
    }
}