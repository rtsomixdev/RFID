using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    public class LaundryRequestDto
    {
        public int VendorId { get; set; }
        public List<string> RfidCodes { get; set; } = new List<string>();
    }

    [Route("api/[controller]")]
    [ApiController]
    public class LaundryController : ControllerBase
    {
        private readonly LinenDbContext _context; 

        public LaundryController(LinenDbContext context)
        {
            _context = context;
        }

        // Helper สำหรับดึงเวลาประเทศไทย (UTC+7)
        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        // 0. CHECK
        [HttpGet("Check/{rfid}")]
        public async Task<ActionResult<object>> CheckLinen(string rfid)
        {
            var linen = await _context.Linens
                .Include(l => l.Product)
                .FirstOrDefaultAsync(l => l.RfidCode == rfid);

            if (linen == null) return NotFound(new { message = "ไม่พบข้อมูล RFID นี้ในระบบ" });

            return Ok(new 
            {
                rfid = linen.RfidCode,
                productName = linen.Product?.ProductName ?? "ไม่ระบุชื่อสินค้า",
                status = linen.Status
            });
        }

        // ==========================================
        // 1. ส่งซัก (Send)
        // ==========================================
        [HttpPost("Send")]
        public async Task<IActionResult> SendToWash([FromBody] LaundryRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาระบุรายการ RFID");

            var linens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบข้อมูลผ้าในระบบ");

            // ✅✅✅ Logic ใหม่: ส่งซักได้เฉพาะ "ใช้แล้ว" หรือ "เปื้อน" เท่านั้น ✅✅✅
            // ตัด Available ออก (ผ้าสะอาดไม่ต้องซัก)
            var allowStatuses = new[] { "In Use", "Dirty", "Stained", "Infection" };
            
            var invalidItems = linens.Where(l => !allowStatuses.Contains(l.Status)).ToList();

            if (invalidItems.Any())
            {
                // แจ้งเตือนละเอียดว่าทำไมส่งไม่ได้
                var detail = invalidItems.First(); // เอาตัวอย่างตัวแรกมาโชว์
                string reason = "สถานะไม่ถูกต้อง";
                
                if (detail.Status == "Available") reason = "ผ้าสะอาดอยู่แล้ว (Available)";
                else if (detail.Status == "Washing") reason = "ผ้ากำลังซักอยู่ (Washing)";
                else if (detail.Status == "Retired") reason = "ผ้าจำหน่ายทิ้ง/เป็นรู (Retired)";

                return BadRequest(new { message = $"ส่งซักไม่ได้! RFID: {detail.RfidCode} สถานะคือ '{detail.Status}' ({reason})" });
            }

            foreach (var linen in linens)
            {
                linen.Status = "Washing";
                linen.VendorId = request.VendorId;
                linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย

                _context.LinenLogs.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ActivityType = "WASH", 
                    Description = $"ส่งซักที่ร้าน ID: {request.VendorId}",
                    Timestamp = ThaiTime() // ✅ เวลาไทย
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"ส่งซักเรียบร้อย {linens.Count} รายการ", count = linens.Count });
        }

        // ==========================================
        // 2. รับคืน (Receive)
        // ==========================================
        [HttpPost("Receive")]
        public async Task<IActionResult> ReceiveClean([FromBody] LaundryRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return BadRequest("กรุณาระบุรายการ RFID");

            var linens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบข้อมูลผ้าในระบบ");

            // ✅✅✅ Logic ใหม่: รับคืนได้เฉพาะผ้าที่ "Washing" เท่านั้น ✅✅✅
            var invalidItems = linens.Where(l => l.Status != "Washing").ToList();

            if (invalidItems.Any())
            {
                var detail = invalidItems.First();
                return BadRequest(new { message = $"รับคืนไม่ได้! RFID: {detail.RfidCode} สถานะคือ '{detail.Status}' (ต้องเป็น Washing เท่านั้น)" });
            }

            foreach (var linen in linens)
            {
                linen.Status = "Available"; // กลับมาพร้อมใช้
                linen.WashCount += 1;
                linen.LastWashDate = ThaiTime(); // ✅ เวลาไทย
                linen.VendorId = null;
                linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย

                _context.LinenLogs.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ActivityType = "RETURN", 
                    Description = "รับผ้าสะอาดกลับเข้าคลัง",
                    Timestamp = ThaiTime() // ✅ เวลาไทย
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"รับผ้ากลับเรียบร้อย {linens.Count} รายการ", count = linens.Count });
        }

        // ==========================================
        // 5. ดึงรายการสำหรับ Dropdown (Searchable Candidates) ✅ เพิ่มใหม่
        // ==========================================
        [HttpGet("Candidates/{mode}")] // mode = "send" หรือ "receive"
        public async Task<ActionResult<IEnumerable<object>>> GetCandidates(string mode)
        {
            // เริ่มต้นดึงข้อมูลพร้อม Product
            var query = _context.Linens.Include(l => l.Product).AsQueryable();

            if (mode == "send") 
            {
                // Tab ส่งผ้า: เอาเฉพาะสถานะ In Use, Dirty, Stained...
                string[] allowStatuses = { "In Use", "Dirty", "Stained", "Infection" };
                query = query.Where(l => allowStatuses.Contains(l.Status));
            }
            else if (mode == "receive") 
            {
                // Tab รับผ้า: เอาเฉพาะสถานะ Washing
                query = query.Where(l => l.Status == "Washing");
            }
            else 
            {
                return BadRequest("Invalid mode");
            }

            // เลือกเฉพาะข้อมูลที่จำเป็นไปแสดง
            var list = await query.Select(l => new {
                l.RfidCode,
                ProductName = l.Product.ProductName, // ชื่อสินค้า
                l.Status
            }).ToListAsync();

            return Ok(list);
        }

        // ... (History, Cancel เหมือนเดิม) ...
        [HttpGet("History")]
        public async Task<ActionResult<IEnumerable<object>>> GetWashingList()
        {
            var washingList = await _context.Linens
                .Where(l => l.Status == "Washing")
                .Include(l => l.Product)
                .Include(l => l.Vendor) 
                .Select(l => new 
                {
                    l.RfidCode,
                    ProductName = l.Product.ProductName,
                    VendorName = l.Vendor.VendorName,
                    SentDate = l.UpdatedAt 
                })
                .ToListAsync();
            return Ok(washingList);
        }
        
        [HttpPost("Cancel")]
        public async Task<IActionResult> CancelLaundry([FromBody] List<string> rfidCodes)
        {
            var linens = await _context.Linens.Where(l => rfidCodes.Contains(l.RfidCode)).ToListAsync();
            if (!linens.Any()) return NotFound("ไม่พบรายการ");
            foreach (var linen in linens)
            {
                linen.Status = "Available"; 
                linen.VendorId = null;
                linen.UpdatedAt = ThaiTime(); // ✅ เวลาไทย
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = $"ยกเลิกรายการเรียบร้อย {linens.Count} รายการ" });
        }
    }
}