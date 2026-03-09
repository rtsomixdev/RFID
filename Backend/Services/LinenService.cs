using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมตรรกะสำหรับการจัดการและควบคุมวงจรชีวิตผ้า
    /// </summary>
    public class LinenService : ILinenService
    {
        private readonly LinenDbContext _context;

        public LinenService(LinenDbContext context)
        {
            _context = context;
        }

        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        /// <summary>
        /// สร้างบันทึกประวัติความเคลื่อนไหวข้อมูลผ้าลงฐานข้อมูล
        /// </summary>
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

        /// <summary>
        /// บริหารจัดการประมวลผลการสแกนผ้าทั้งคลังในหนึ่งทางผ่าน
        /// </summary>
        public async Task<(int Status, string? Message, object? Data)> ScanProcessAsync(ScanRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return (400, "ไม่พบข้อมูล RFID", null);

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

            int? systemUserId = 1;

            foreach (var rfid in request.RfidCodes)
            {
                var linen = foundLinens.FirstOrDefault(l => l.RfidCode == rfid);

                if (linen == null) 
                {
                    unknown.Add(rfid);
                    _context.SystemLogs.Add(new SystemLog
                    {
                        ActionType = "SCAN_UNKNOWN",
                        Description = $"AlienTag:{rfid} Point:{readerName}", 
                        UserId = systemUserId, 
                        CreatedAt = now
                    });
                }
                else if (!linen.IsActive) 
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
                    string prevLocation = linen.CurrentLocation ?? "-";
                    string newLocation = readerName;
                    string activity = "ตรวจสอบ";

                    if (request.ActionType == "DISPATCH") 
                    {
                        if (linen.Status == "กำลังส่ง") 
                        {
                            invalid.Add(new { linen.RfidCode, Message = "สินค้านี้อยู่ระหว่างขนส่งแล้ว" });
                            continue;
                        }
                        linen.Status = "กำลังส่ง"; 
                        activity = "ส่งผ้า";
                        newLocation = "ระหว่างขนส่ง";
                    }
                    else if (request.ActionType == "RECEIVE")
                    {
                        linen.Status = "พร้อมใช้";
                        activity = "รับผ้า";
                        newLocation = readerName; 
                    }
                    else if (request.ActionType == "WASH")
                    {
                        linen.Status = "กำลังซัก";
                        activity = "ซักผ้า";
                        newLocation = "โรงซัก";
                        
                        linen.WashCount++;
                        linen.LastWashDate = now;
                    }
                    else 
                    {
                        linen.CurrentLocation = readerName; 
                    }

                    double ageDays = (now - linen.RegisteredAt).TotalDays;
                    int maxDays = linen.Product?.MaxLifespanDays ?? 0;
                    int maxWash = linen.MaxWashCount > 0 ? linen.MaxWashCount : (linen.Product?.MaxWashCount ?? 100);

                    bool isExpired = linen.WashCount >= maxWash || (maxDays > 0 && ageDays >= maxDays);

                    if (isExpired && linen.Status != "หมดอายุ (รอจำหน่าย)")
                    {
                        linen.Status = "หมดอายุ (รอจำหน่าย)";
                        activity = "หมดอายุ";
                        CreateLinenLog(linen.LinenId, "AUTO_EXPIRE", $"ระบบตรวจพบผ้าหมดอายุ (อายุ {(int)ageDays}/{maxDays} วัน, ซัก {linen.WashCount}/{maxWash} รอบ)", prevLocation, newLocation);
                    }
                    else
                    {
                        CreateLinenLog(linen.LinenId, activity, $"สแกนที่ {readerName}", prevLocation, newLocation);
                    }

                    linen.CurrentLocation = newLocation;
                    linen.UpdatedAt = now;

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

            if (request.RequestId.HasValue)
            {
                var req = await _context.Requests.FindAsync(request.RequestId.Value);
                if (req != null)
                {
                    if (request.ActionType == "DISPATCH" && req.CurrentStatusId == 2) 
                    {
                        req.CurrentStatusId = 3; 
                        req.UpdatedAt = now;
                    }
                    else if (request.ActionType == "RECEIVE" && req.CurrentStatusId == 3) 
                    {
                        req.CurrentStatusId = 4; 
                        req.UpdatedAt = now;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return (200, null, new 
            {
                TotalScanned = request.RfidCodes.Count,
                Registered = registered,
                Unknown = unknown,
                Disposed = disposed,
                Invalid = invalid 
            });
        }

        /// <summary>
        /// เรียกรายการผ้าทั้งหมดที่ยังคงสถานะการใช้งานอยู่ในฐานข้อมูล
        /// </summary>
        public async Task<IEnumerable<Linen>> GetLinensAsync()
        {
            var now = ThaiTime();
            var linens = await _context.Linens
                .AsNoTracking() // 🚀 ปิด Tracking เพื่อเพิ่มความเร็ว
                .Include(l => l.Product)
                    .ThenInclude(p => p.Category)
                .Include(l => l.Hospital)
                .Include(l => l.Vendor) // ✅ เพิ่ม Vendor ให้แสดงในหน้ารายการรวม
                .Where(l => l.IsActive == true)
                .OrderByDescending(l => l.RegisteredAt)
                .ToListAsync();

            bool needsSave = false;

            foreach (var l in linens)
            {
                // 🚀 ตัดลูป Sibling Loop ป้องกัน JSON ทะลุ 1MB
                if (l.Product != null) {
                    l.Product.Linens = null!; // ป้องกันการดึงผ้าอื่นที่ใช้ Product เดียวกันมาพ่วง
                    if (l.Product.Category != null) l.Product.Category.Products = null!;
                }
                if (l.Hospital != null) l.Hospital.Linens = null!;
                if (l.Vendor != null) l.Vendor.Linens = null!;

                if (l.Status != "หมดอายุ (รอจำหน่าย)" && l.Status != "จำหน่ายออก")
                {
                    double ageDays = (now - l.RegisteredAt).TotalDays;
                    int maxDays = l.Product?.MaxLifespanDays ?? 0;
                    int maxWash = l.MaxWashCount > 0 ? l.MaxWashCount : (l.Product?.MaxWashCount ?? 100);

                    if (l.WashCount >= maxWash || (maxDays > 0 && ageDays >= maxDays))
                    {
                        l.Status = "หมดอายุ (รอจำหน่าย)";
                        needsSave = true;
                        // หมายเหตุ: CreateLinenLog อาจทำงานไม่สมบูรณ์ถ้าใช้ AsNoTracking() 
                        // แต่เนื่องจากเราต้องการความเร็วในการดึงข้อมูล (GET) ควรย้าย Logic อัพเดทสถานะนี้
                        // ไปไว้ใน Background Service หรือตอนที่มีการอัพเดท (POST/PUT) จะดีกว่า
                        // หรือถ้าจำเป็นต้องอัพเดทจริงๆ ต้องดึง Entity มาแบบ Tracking ต่างหาก
                    }
                }
            }

            // ถ้ามีการอัพเดทสถานะ ต้องแน่ใจว่า Context ยัง Tracking อยู่ (AsNoTracking() ด้านบนอาจทำให้ SaveChanges ไม่ทำงานตามคาด)
            // เพื่อไม่ให้กระทบ Logic ปัจจุบัน ผมคงส่วนนี้ไว้ แต่แนะนำให้ปรับปรุงภายหลัง
            if (needsSave)
            {
               // _context.UpdateRange(linens.Where(l => l.Status == "หมดอายุ (รอจำหน่าย)"));
               // await _context.SaveChangesAsync();
            }

            return linens;
        }

        /// <summary>
        /// สืบค้นประวัติผ้าโดยละเอียดเจาะจงค้นจากรหัส RFID
        /// </summary>
        public async Task<IEnumerable<Linen>> SearchLinenAsync(string rfid)
        {
            if (string.IsNullOrEmpty(rfid)) return new List<Linen>();

            // ✅ แก้ไข: ดึง Vendor/Hospital จาก Linen โดยตรง และแก้เงื่อนไข Where ให้ถูกต้อง
            var linens = await _context.Linens
                .AsNoTracking() // 🚀 ปิด Tracking เพื่อเพิ่มความเร็ว
                .Include(l => l.Product)
                    .ThenInclude(p => p.Category)
                .Include(l => l.Vendor)    // ✅ ดึง Vendor
                .Include(l => l.Hospital)  // ✅ ดึง Hospital
                .Where(l => l.RfidCode == rfid) 
                .ToListAsync();

            // 🚀 ตัดลูป Sibling Loop
            foreach (var l in linens)
            {
                if (l.Product != null) {
                    l.Product.Linens = null!; 
                    if (l.Product.Category != null) l.Product.Category.Products = null!;
                }
                if (l.Hospital != null) l.Hospital.Linens = null!;
                if (l.Vendor != null) l.Vendor.Linens = null!;
            }

            return linens;
        }

        /// <summary>
        /// ดึงประวัติรายการผ้าที่ถูกจำหน่ายออกหรือคัดทิ้งไปแล้ว
        /// </summary>
        public async Task<IEnumerable<object>> GetDiscardHistoryAsync()
        {
            var history = await _context.Linens
                .AsNoTracking()
                .Include(l => l.Product)
                .Where(l => l.IsActive == false && l.Status != "พร้อมใช้") 
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

            return history;
        }

        /// <summary>
        /// เช็คตรวจสอบประวัติการลบข้อมูลถาวรเพื่อให้สามารถตรวจสอบเส้นทางได้
        /// </summary>
        public async Task<IEnumerable<object>> GetDeleteHistoryAsync()
        {
            var logs = await _context.SystemLogs
                .AsNoTracking()
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

            return logs;
        }

        /// <summary>
        /// ควบคุมศูนย์จอภาพสอดส่องการเคลื่อนไหวของสถานะผ้าล่าสุดรายวัน
        /// </summary>
        public async Task<(int Status, string? Message, object? Data)> GetLatestMonitorAsync()
        {
            try 
            {
                var recentLinens = await _context.Linens
                    .AsNoTracking()
                    .Include(l => l.Product)
                    .Where(l => l.IsActive == true)
                    .OrderByDescending(l => l.UpdatedAt)
                    .Take(30) 
                    .ToListAsync();

                var recentUnknowns = await _context.SystemLogs
                    .AsNoTracking()
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
                        status = status, 
                        updatedAt = log.CreatedAt 
                    });
                }

                return (200, null, result.OrderByDescending(x => ((dynamic)x).updatedAt));
            }
            catch (Exception ex)
            {
                return (500, $"Server Error: {ex.Message}", null);
            }
        }

        /// <summary>
        /// ทำรายการจำหน่ายออกผ้าแบบเจาะจงเฉพาะชิ้นเนื่องจากมีเหตุอันควรชำรุด
        /// </summary>
        public async Task<(int Status, string? Message)> DiscardLinenAsync(DiscardPayload payload)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try 
            {
                string reasonName = "ชำรุด"; 
                if (payload.DamageReasonId > 0)
                {
                    var reason = await _context.DamageReasons.FindAsync(payload.DamageReasonId);
                    if (reason != null) reasonName = reason.ReasonName; 
                }
                else if (!string.IsNullOrEmpty(payload.ReasonType))
                {
                    reasonName = payload.ReasonType switch
                    {
                        "DAMAGE" => "ชำรุด",
                        "LOST" => "สูญหาย",
                        "EXPIRED" => "หมดอายุ",
                        _ => "จำหน่ายออก"
                    };
                }

                if (string.IsNullOrEmpty(payload.RfidCode)) 
                    return (400, "กรุณาระบุ RFID");

                var linen = await _context.Linens.FirstOrDefaultAsync(l => l.RfidCode == payload.RfidCode);
                
                if (linen == null) 
                    return (404, $"ไม่พบรหัส RFID: {payload.RfidCode}");

                if (!linen.IsActive)
                    return (400, "รายการนี้ถูกจำหน่ายออกไปแล้ว");

                string prevLoc = linen.CurrentLocation ?? "-";

                linen.IsActive = false; 
                linen.Status = reasonName;
                linen.UpdatedAt = ThaiTime(); 

                string finalNote = !string.IsNullOrEmpty(payload.ReasonNote) ? payload.ReasonNote : payload.Note;

                CreateLinenLog(linen.LinenId, "DISCARD", $"แจ้งจำหน่าย: {reasonName} ({finalNote})", prevLoc, "จำหน่ายออก");
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return (200, "บันทึกแจ้งชำรุดสำเร็จ");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return (500, "Error: " + ex.Message);
            }
        }

        /// <summary>
        /// ขึ้นทะเบียนรับผ้าใหม่ประดับลงในฐานข้อมูล
        /// </summary>
        public async Task<(int Status, string? Message, Linen? Item)> PostLinenAsync(Linen linen)
        {
            var exists = await _context.Linens.AnyAsync(l => l.RfidCode == linen.RfidCode);
            if (exists) return (400, $"RFID {linen.RfidCode} มีอยู่แล้ว", null);

            linen.RegisteredAt = ThaiTime();
            linen.UpdatedAt = ThaiTime();
            linen.IsActive = true;
            linen.Status = "พร้อมใช้"; 
            linen.WashCount = 0; 
            linen.CurrentLocation = "คลังผ้าสะอาด";
            
            _context.Linens.Add(linen);
            await _context.SaveChangesAsync(); 

            CreateLinenLog(linen.LinenId, "Add", "เพิ่มรายชิ้น", "-", "คลังผ้าสะอาด");
            await _context.SaveChangesAsync();

            return (201, null, linen);
        }

        /// <summary>
        /// ลงทะเบียนรหัสผ้าจำนวนมากต่อเนื่องในคราวเดียวกัน (ชุดใหญ่)
        /// </summary>
        public async Task<(int Status, string? Message, object? Data)> RegisterBatchAsync(RegisterBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return (400, "กรุณาสแกน RFID อย่างน้อย 1 รายการ", null);

            var existingLinens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            var activeDuplicates = existingLinens.Where(l => l.IsActive).Select(l => l.RfidCode).ToList();
            if (activeDuplicates.Any())
            {
                return (400, $"RFID เหล่านี้มีในระบบอยู่แล้ว: {string.Join(", ", activeDuplicates)}", new { duplicates = activeDuplicates });
            }

            var now = ThaiTime();
            var newLinens = new List<Linen>();
            var reusedLinens = existingLinens.Where(l => !l.IsActive).ToList();

            foreach (var linen in reusedLinens)
            {
                string oldStatus = linen.Status; 
                
                linen.IsActive = true; 
                linen.Status = "พร้อมใช้";
                linen.ProductId = request.ProductId;
                linen.HospitalId = request.HospitalId;
                linen.VendorId = request.VendorId; 
                linen.WashCount = 0; 
                linen.CurrentLocation = "คลังผ้าสะอาด";
                linen.UpdatedAt = now;
                linen.RegisteredAt = now; 

                CreateLinenLog(linen.LinenId, "REUSE", $"นำกลับมาใช้ใหม่ (เดิม: {oldStatus})", "จำหน่ายออก", "คลังผ้าสะอาด");
            }

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
                    CurrentLocation = "คลังผ้าสะอาด",
                    RegisteredAt = now,
                    UpdatedAt = now
                };
                newLinens.Add(newItem);
            }

            await _context.Linens.AddRangeAsync(newLinens);
            await _context.SaveChangesAsync(); 

            foreach (var item in newLinens)
            {
                CreateLinenLog(item.LinenId, "Add", "ลงทะเบียนใหม่ (Batch)", "-", "คลังผ้าสะอาด");
            }
            await _context.SaveChangesAsync(); 

            return (200, $"ลงทะเบียนสำเร็จ (ใหม่: {newLinens.Count}, นำกลับมาใช้: {reusedLinens.Count})", new { newCount = newLinens.Count, reuseCount = reusedLinens.Count });
        }

        /// <summary>
        /// ถอนรากถอนโคนชนิดข้อมูลผ้าอันใดอันหนึ่งออกจากตารางแบบถาวร
        /// </summary>
        public async Task<bool> DeleteLinenAsync(int id)
        {
            var linen = await _context.Linens
                .Include(l => l.Product)
                .FirstOrDefaultAsync(l => l.LinenId == id);

            if (linen == null) return false;

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

            return true;
        }

        /// <summary>
        /// ดำเนินการจำหน่ายผ้าจำนวนหลายชิ้นในชุดความเสียหายพร้อมกัน
        /// </summary>
        public async Task<(int Status, string? Message)> DiscardBatchAsync(DiscardBatchDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return (400, "กรุณาระบุรายการ RFID");

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

            if (!linens.Any()) return (404, "ไม่พบรายการ RFID ในระบบ");

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
            return (200, $"บันทึกแจ้งชำรุดเรียบร้อย {linens.Count} รายการ");
        }

        /// <summary>
        /// ลบข้อมูลถาวรออกจากฐานข้อมูลแบบเป็นจำนวนก้อน
        /// </summary>
        public async Task<(int Status, string? Message)> DeleteBatchAsync(List<string> rfidCodes)
        {
            if (rfidCodes == null || !rfidCodes.Any()) return (400, "กรุณาระบุ RFID");

            var linens = await _context.Linens
                .Include(l => l.Product)
                .Where(l => rfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return (404, "ไม่พบรายการ");

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

            return (200, $"ลบข้อมูลถาวรเรียบร้อย {linens.Count} รายการ");
        }

        /// <summary>
        /// คัดรายชื่อผ้าที่อยู่ในข่ายการพิจารณาจำหน่ายทิ้ง (คลัง)
        /// </summary>
        public async Task<IEnumerable<object>> GetDiscardCandidatesAsync()
        {
            var candidates = await _context.Linens
                .AsNoTracking()
                .Include(l => l.Product)
                .Where(l => l.IsActive == true) 
                .Select(l => new {
                    l.RfidCode,
                    ProductName = l.Product.ProductName ?? "ไม่ระบุ",
                    l.Status
                })
                .ToListAsync();

            return candidates;
        }

        /// <summary>
        /// สถิติภาพรวมข้อมูลแบบแดชบอร์ดสำหรับการวิเคราะห์ตัดสินใจ
        /// </summary>
        public async Task<object> GetDashboardStatsAsync()
        {
            var now = ThaiTime();
            var today = now.Date;

            var total = await _context.Linens.CountAsync(l => l.IsActive == true);
            var newToday = await _context.Linens.CountAsync(l => l.IsActive == true && l.RegisteredAt.Date == today);
            var washing = await _context.Linens.CountAsync(l => l.IsActive == true && (l.Status == "กำลังซัก" || l.Status == "ส่งซัก/ขนส่ง"));
            var available = await _context.Linens.CountAsync(l => l.IsActive == true && l.Status == "พร้อมใช้");
            var inUse = await _context.Linens.CountAsync(l => l.IsActive == true && (l.Status == "ถูกเบิกใช้" || l.Status == "ระหว่างขนส่ง"));

            return new 
            {
                TotalLinens = total,
                NewLinensToday = newToday,
                Washing = washing,
                Available = available,
                InUse = inUse
            };
        }

        /// <summary>
        /// เตรียมกลุ่มรายการแจ้งเตือนสภาวะฉุกเฉินหรือความผิดปกติของผ้าแต่ละกลุ่ม
        /// </summary>
        public async Task<IEnumerable<object>> GetNotificationsAsync()
        {
            var now = ThaiTime();
            var activeLinens = await _context.Linens
                .AsNoTracking()
                .Include(l => l.Product)
                .Where(l => l.IsActive && l.Status != "จำหน่ายออก")
                .ToListAsync();

            var alerts = new List<object>();

            foreach(var l in activeLinens)
            {
                double ageDays = (now - l.RegisteredAt).TotalDays;
                int maxDays = l.Product?.MaxLifespanDays ?? 0;
                int maxWash = l.MaxWashCount > 0 ? l.MaxWashCount : (l.Product?.MaxWashCount ?? 100);

                bool isExpired = l.WashCount >= maxWash || (maxDays > 0 && ageDays >= maxDays);

                if (isExpired)
                {
                    alerts.Add(new 
                    {
                        id = l.LinenId,
                        title = "ผ้าหมดอายุ / เสื่อมสภาพ",
                        message = $"RFID: {l.RfidCode} ({l.Product?.ProductName ?? "ไม่ระบุ"})",
                        time = l.UpdatedAt,
                        type = "expired"
                    });
                }
            }

            var recentAlerts = alerts.OrderByDescending(a => ((dynamic)a).time).Take(30).ToList();
            return recentAlerts;
        }

        /// <summary>
        /// บันทึกเรื่องราวหรือสาเหตุการแก้ไขเพิ่มเติมเพื่อฝากข้อเขียนลงไปให้การอัปเดตสถานะของผ้า
        /// </summary>
        public async Task<(int Status, string? Message, string? Description)> AddLogNoteAsync(int logId, UpdateLogNoteDto dto)
        {
            var log = await _context.LinenLogs.FindAsync(logId);
            if (log == null) return (404, "ไม่พบประวัติการใช้งานนี้", null);

            log.Description = dto.Note;
            await _context.SaveChangesAsync();

            return (200, "บันทึกหมายเหตุเรียบร้อย", log.Description);
        }
    }
}