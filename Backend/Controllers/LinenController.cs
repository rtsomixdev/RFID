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
    // DTOs
    // ==========================================

    public class DiscardPayload
    {
        public string? RfidCode { get; set; }
        public int? ProductId { get; set; }
        public int DamageReasonId { get; set; } 
        public string? ReasonType { get; set; } 
        public string? ReasonNote { get; set; } 
        public string? Note { get; set; } 
        public int ReportedByUserId { get; set; }
    }

    public class DiscardBatchDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int DamageReasonId { get; set; }
        public string? ReasonType { get; set; }
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

        // ✅ Helper: บันทึก Log
        private void CreateLinenLog(int linenId, string activity, string description, string from = "-", string to = "-")
        {
            _context.LinenLogs.Add(new LinenLog
            {
                LinenId = linenId,
                ActivityType = activity, 
                Description = description,
                FromLocation = from,
                ToLocation = to,
                CreatedAt = ThaiTime()
            });
        }

        // ==========================================
        // 🔥 0. POST: Scan Logic (ภาษาไทย + Robust)
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

            string readerName = "จุดสแกนไม่ระบุ";
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

            // ✅ ป้องกัน Error กรณีไม่มี User ID 1
            int? systemUserId = 1;
            bool userExists = await _context.Users.AnyAsync(u => u.UserId == 1);
            if (!userExists) systemUserId = null;

            foreach (var rfid in request.RfidCodes)
            {
                var linen = foundLinens.FirstOrDefault(l => l.RfidCode == rfid);

                if (linen == null) // 🔴 Alien Tag
                {
                    unknown.Add(rfid);
                    _context.SystemLogs.Add(new SystemLog
                    {
                        ActionType = "SCAN_UNKNOWN",
                        // ⚠️ Format นี้ต้องคงไว้เพื่อให้ Frontend ตัดคำได้ถูกต้อง (AlienTag:...)
                        Description = $"AlienTag:{rfid} Point:{readerName}", 
                        UserId = systemUserId, 
                        CreatedAt = now
                    });
                }
                else if (!linen.IsActive) // 🔴 จำหน่ายออกไปแล้ว
                {
                    disposed.Add(new { linen.RfidCode, Status = "จำหน่ายออก" });
                    _context.SystemLogs.Add(new SystemLog
                    {
                        ActionType = "SCAN_DISPOSED",
                        Description = $"DisposedTag:{rfid} Point:{readerName}",
                        UserId = systemUserId, 
                        CreatedAt = now
                    });
                }
                else
                {
                    // ✅ 1. เก็บ Location เดิม
                    string prevLocation = linen.CurrentLocation ?? "-";
                    string newLocation = readerName;
                    string activity = "ตรวจสอบ";

                    // ✅ 2. คำนวณ Location ใหม่ (ภาษาไทย)
                    if (request.ActionType == "DISPATCH") 
                    {
                        if (linen.Status == "ส่งซัก/ขนส่ง") 
                        {
                            invalid.Add(new { linen.RfidCode, Message = "สินค้านี้อยู่ระหว่างขนส่งแล้ว" });
                            continue;
                        }
                        linen.Status = "ส่งซัก/ขนส่ง"; 
                        activity = "ส่งซัก";
                        newLocation = "โรงซัก"; // Laundry
                    }
                    else if (request.ActionType == "RECEIVE")
                    {
                        if (linen.Status != "ส่งซัก/ขนส่ง") 
                        {
                            invalid.Add(new { linen.RfidCode, Message = "ต้องส่งมาก่อนถึงจะรับได้" });
                            continue;
                        }
                        linen.Status = "พร้อมใช้";
                        activity = "รับผ้าสะอาด";
                        newLocation = "คลังผ้า"; // Stock
                    }
                    else 
                    {
                        linen.CurrentLocation = readerName; // แค่ Check
                    }

                    // ✅ 3. อัปเดตค่าจริง
                    linen.CurrentLocation = newLocation;
                    linen.UpdatedAt = now;

                    CreateLinenLog(linen.LinenId, activity, $"สแกนที่ {readerName}", prevLocation, newLocation);

                    bool isExpired = linen.WashCount >= linen.MaxWashCount;
                    registered.Add(new 
                    {
                        linen.LinenId,
                        linen.RfidCode,
                        ProductName = linen.Product?.ProductName ?? "ไม่ระบุ",
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
        // 🔥 เพิ่ม API: Search (สำหรับหน้า Discard)
        // ==========================================
        [HttpGet("Search")]
        public async Task<IActionResult> SearchLinen([FromQuery] string rfid)
        {
            if (string.IsNullOrEmpty(rfid)) return BadRequest("ระบุ RFID");

            var linens = await _context.Linens
                .Include(l => l.Product)
                .Where(l => l.RfidCode == rfid) 
                .ToListAsync();

            if (!linens.Any()) return Ok(new List<object>()); 

            return Ok(linens);
        }

        // ==========================================
        // 2. GET: DiscardHistory
        // ==========================================
        [HttpGet("DiscardHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardHistory()
        {
            var history = await _context.Linens
                .Include(l => l.Product)
                .Where(l => l.IsActive == false && l.Status != "พร้อมใช้") // กรองเอาเฉพาะที่จำหน่าย
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
                .Where(x => x.ActionType.Contains("DELETE") || 
                            x.ActionType.Contains("DISCARD") || 
                            x.ActionType == "SCAN_UNKNOWN" || 
                            x.ActionType == "SCAN_DISPOSED")
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
                        productName = l.Product?.ProductName ?? "สินค้าไม่ระบุ",
                        location = l.CurrentLocation ?? "ไม่ระบุ", 
                        status = l.Status ?? "ไม่ทราบสถานะ",
                        updatedAt = l.UpdatedAt
                    });
                }

                foreach (var log in recentUnknowns)
                {
                    string rfid = "Unknown";
                    string loc = "จุดไม่ระบุ";
                    string status = log.ActionType == "SCAN_DISPOSED" ? "จำหน่ายแล้ว" : "Alien"; 
                    // ใช้ Alien เพื่อให้ Frontend รู้ว่าเป็นกล่องแดง

                    try 
                    {
                        if (!string.IsNullOrEmpty(log.Description))
                        {
                            if (log.Description.Contains("Tag:")) {
                                var parts = log.Description.Split(' ');
                                foreach (var p in parts) {
                                    if (p.StartsWith("AlienTag:") || p.StartsWith("DisposedTag:")) 
                                        rfid = p.Split(':')[1];
                                    if (p.StartsWith("Point:")) 
                                        loc = p.Split(':')[1];
                                }
                            }
                            else if (log.Description.Contains(":")) {
                                var parts = log.Description.Split(':');
                                if (parts.Length > 1) rfid = parts[1].Trim().Split(' ')[0];
                            }
                        }
                    } 
                    catch { rfid = "Parse Error"; }

                    result.Add(new 
                    {
                        rfid = rfid,
                        productName = status == "จำหน่ายแล้ว" ? "จำหน่ายแล้ว (Disposed)" : "ไม่พบในระบบ", 
                        location = loc,
                        status = status, // Frontend ใช้คำนี้เช็ค
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
        // 5. POST: Discard (Single) - ภาษาไทย
        // ==========================================
        [HttpPost("Discard")]
        public async Task<IActionResult> DiscardLinen([FromBody] DiscardPayload payload)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try 
            {
                string reasonName = "ชำรุด"; 
                if (payload.DamageReasonId > 0)
                {
                    var reason = await _context.DamageReasons.FindAsync(payload.DamageReasonId);
                    if (reason != null) reasonName = reason.ReasonName; // ควรแก้ใน DB ให้เป็นภาษาไทยด้วย
                }
                else if (!string.IsNullOrEmpty(payload.ReasonType))
                {
                    // Map เป็นภาษาไทย
                    reasonName = payload.ReasonType switch
                    {
                        "DAMAGE" => "ชำรุด",
                        "LOST" => "สูญหาย",
                        "EXPIRED" => "หมดอายุ",
                        _ => "จำหน่ายออก"
                    };
                }

                if (string.IsNullOrEmpty(payload.RfidCode)) 
                    return BadRequest(new { message = "กรุณาระบุ RFID" });

                var linen = await _context.Linens.FirstOrDefaultAsync(l => l.RfidCode == payload.RfidCode);
                
                if (linen == null) 
                    return NotFound(new { message = $"ไม่พบรหัส RFID: {payload.RfidCode}" });

                if (!linen.IsActive)
                    return BadRequest(new { message = "รายการนี้ถูกจำหน่ายออกไปแล้ว" });

                string prevLoc = linen.CurrentLocation ?? "-";

                // ✅ Reset Tag
                linen.IsActive = false; 
                linen.Status = reasonName;
                linen.UpdatedAt = ThaiTime(); 

                string finalNote = !string.IsNullOrEmpty(payload.ReasonNote) ? payload.ReasonNote : payload.Note;

                // ✅ Log Flow: ActivityType="DISCARD"
                CreateLinenLog(linen.LinenId, "DISCARD", $"แจ้งจำหน่าย: {reasonName} ({finalNote})", prevLoc, "จำหน่ายออก");
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "บันทึกแจ้งชำรุดสำเร็จ" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Error: " + ex.Message });
            }
        }

        // ==========================================
        // 6. POST: PostLinen (Manual Single Add)
        // ==========================================
        [HttpPost]
        public async Task<ActionResult<Linen>> PostLinen(Linen linen)
        {
            var exists = await _context.Linens.AnyAsync(l => l.RfidCode == linen.RfidCode);
            if (exists) return BadRequest(new { message = $"RFID {linen.RfidCode} มีอยู่แล้ว" });

            linen.RegisteredAt = ThaiTime();
            linen.UpdatedAt = ThaiTime();
            linen.IsActive = true;
            linen.Status = "พร้อมใช้"; 
            linen.WashCount = 0; 
            linen.CurrentLocation = "คลังผ้า";
            
            _context.Linens.Add(linen);
            await _context.SaveChangesAsync(); 

            CreateLinenLog(linen.LinenId, "Add", "เพิ่มรายชิ้น", "-", "คลังผ้า");
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetLinens", new { id = linen.LinenId }, linen);
        }

        // ==========================================
        // 7. POST: RegisterBatch (Reuse - ภาษาไทย)
        // ==========================================
        [HttpPost("RegisterBatch")]
        public async Task<IActionResult> RegisterBatch([FromBody] RegisterBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาสแกน RFID อย่างน้อย 1 รายการ");

            var existingLinens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            var activeDuplicates = existingLinens.Where(l => l.IsActive).Select(l => l.RfidCode).ToList();
            if (activeDuplicates.Any())
            {
                return BadRequest(new { 
                    message = $"RFID เหล่านี้มีในระบบอยู่แล้ว: {string.Join(", ", activeDuplicates)}",
                    duplicates = activeDuplicates 
                });
            }

            var now = ThaiTime();
            var newLinens = new List<Linen>();
            var reusedLinens = existingLinens.Where(l => !l.IsActive).ToList();

            // 3. Logic REUSE
            foreach (var linen in reusedLinens)
            {
                string oldStatus = linen.Status; 
                
                linen.IsActive = true; 
                linen.Status = "พร้อมใช้";
                linen.ProductId = request.ProductId;
                linen.HospitalId = request.HospitalId;
                linen.VendorId = request.VendorId;
                linen.WashCount = 0; 
                linen.CurrentLocation = "คลังผ้า";
                linen.UpdatedAt = now;
                linen.RegisteredAt = now; 

                CreateLinenLog(linen.LinenId, "REUSE", $"นำกลับมาใช้ใหม่ (เดิม: {oldStatus})", "จำหน่ายออก", "คลังผ้า");
            }

            // 4. Logic NEW
            var newRfids = request.RfidCodes.Except(existingLinens.Select(l => l.RfidCode)).ToList();
            foreach (var rfid in newRfids)
            {
                var newItem = new Linen
                {
                    RfidCode = rfid,
                    ProductId = request.ProductId,
                    HospitalId = request.HospitalId,
                    VendorId = request.VendorId,
                    Status = "พร้อมใช้",
                    IsActive = true,
                    WashCount = 0,
                    MaxWashCount = 100, 
                    CurrentLocation = "คลังผ้า",
                    RegisteredAt = now,
                    UpdatedAt = now
                };
                newLinens.Add(newItem);
            }

            await _context.Linens.AddRangeAsync(newLinens);
            await _context.SaveChangesAsync(); 

            foreach (var item in newLinens)
            {
                CreateLinenLog(item.LinenId, "Add", "ลงทะเบียนใหม่ (Batch)", "-", "คลังผ้า");
            }
            await _context.SaveChangesAsync(); 

            return Ok(new { 
                message = $"ลงทะเบียนสำเร็จ (ใหม่: {newLinens.Count}, นำกลับมาใช้: {reusedLinens.Count})",
                newCount = newLinens.Count,
                reuseCount = reusedLinens.Count
            });
        }
        
        // ==========================================
        // 8. DELETE
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
                Description = $"ลบถาวร {linen.RfidCode} : {linen.Product?.ProductName ?? "ไม่ระบุ"}",
                CreatedAt = ThaiTime()
            };
            _context.SystemLogs.Add(log);

            _context.Linens.Remove(linen);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ==========================================
        // 9. POST: DiscardBatch (ภาษาไทย)
        // ==========================================
        [HttpPost("DiscardBatch")]
        public async Task<IActionResult> DiscardBatch([FromBody] DiscardBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาระบุรายการ RFID");

            var reasonName = "ชำรุด";
            if (request.DamageReasonId > 0) {
                var reason = await _context.DamageReasons.FindAsync(request.DamageReasonId);
                if (reason != null) reasonName = reason.ReasonName;
            } else if (!string.IsNullOrEmpty(request.ReasonType)) {
                 reasonName = request.ReasonType switch {
                    "DAMAGE" => "ชำรุด", "LOST" => "สูญหาย", "EXPIRED" => "หมดอายุ", _ => "จำหน่ายออก"
                };
            }

            var linens = await _context.Linens
                .Include(l => l.Product)
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบรายการ RFID ในระบบ");

            var now = ThaiTime();

            foreach (var linen in linens)
            {
                if (!linen.IsActive) continue; 

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

                CreateLinenLog(linen.LinenId, "DISCARD", $"แจ้งชำรุด: {reasonName} ({request.Note})", prevLoc, "จำหน่ายออก");
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
                Description = $"ลบถาวร {l.RfidCode} : {l.Product?.ProductName ?? "ไม่ระบุ"}",
                CreatedAt = now
            });
            await _context.SystemLogs.AddRangeAsync(logs);

            _context.Linens.RemoveRange(linens);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"ลบข้อมูลถาวรเรียบร้อย {linens.Count} รายการ" });
        }

        // ==========================================
        // 11. GET: Candidates
        // ==========================================
        [HttpGet("Candidates/Discard")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardCandidates()
        {
            var candidates = await _context.Linens
                .Include(l => l.Product)
                .Where(l => l.IsActive == true) 
                .Select(l => new {
                    l.RfidCode,
                    ProductName = l.Product.ProductName ?? "ไม่ระบุ",
                    l.Status
                })
                .ToListAsync();

            return Ok(candidates);
        }

        // ==========================================
        // 📊 12. GET: Dashboard Stats (แก้ Query ให้ตรงภาษาไทย)
        // ==========================================
        [HttpGet("Dashboard/Stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var now = ThaiTime();
            var today = now.Date;

            var total = await _context.Linens.CountAsync(l => l.IsActive == true);

            var newToday = await _context.Linens
                .CountAsync(l => l.IsActive == true && l.RegisteredAt.Date == today);

            // แก้คำค้นหาให้ตรงกับที่ Save ลง DB
            var washing = await _context.Linens.CountAsync(l => l.IsActive == true && (l.Status == "กำลังซัก" || l.Status == "ส่งซัก/ขนส่ง"));

            var available = await _context.Linens.CountAsync(l => l.IsActive == true && l.Status == "พร้อมใช้");

            var inUse = await _context.Linens.CountAsync(l => l.IsActive == true && (l.Status == "ถูกเบิกใช้" || l.Status == "ระหว่างขนส่ง"));

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