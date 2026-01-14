using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    public class TransportDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int ReaderId { get; set; } // เครื่องอ่านตัวไหนเป็นคนสแกน
        public int? RequestId { get; set; } // (Optional) อ้างอิงใบงานไหน
    }

    [Route("api/[controller]")]
    [ApiController]
    public class TransportController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public TransportController(LinenDbContext context)
        {
            _context = context;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        // ==========================================
        // 🚚 1. POST: ส่งผ้าออก (Dispatch / Check-out)
        // ==========================================
        [HttpPost("Dispatch")]
        public async Task<IActionResult> Dispatch([FromBody] TransportDto input)
        {
            // 1. ตรวจสอบเครื่องอ่าน (ต้องเป็น ReaderType = DISPATCH หรือ GATE)
            var reader = await _context.Readers.FindAsync(input.ReaderId);
            if (reader == null) return BadRequest("ไม่พบข้อมูลเครื่องอ่าน RFID");

            // 2. ดึงข้อมูลผ้า
            var linens = await _context.Linens
                .Where(l => input.RfidCodes.Contains(l.RfidCode) && l.IsActive)
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบผ้าที่ระบุในระบบ");

            var now = ThaiTime();
            var logList = new List<LinenLog>();

            foreach (var linen in linens)
            {
                // Logic: เปลี่ยนสถานะเป็น "กำลังส่ง"
                linen.Status = "InTransit";
                linen.CurrentLocation = "InTransit"; 
                linen.UpdatedAt = now;

                // Log การเคลื่อนไหว
                logList.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ReaderId = input.ReaderId,
                    StatusAfter = "InTransit",
                    CreatedAt = now,
                    Description = $"ส่งออกจาก {reader.Location ?? reader.ReaderName}"
                });
            }

            // ถ้ามี RequestId ส่งมาด้วย ให้ไปอัปเดตใบงานว่า "เริ่มส่งแล้ว"
            if (input.RequestId.HasValue)
            {
                var req = await _context.Requests.FindAsync(input.RequestId.Value);
                if (req != null)
                {
                    req.Status = "InTransit";
                    req.DispatchDate = now;
                }
            }

            _context.LinenLogs.AddRange(logList);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"บันทึกการส่งออก {linens.Count} รายการ", status = "InTransit" });
        }

        // ==========================================
        // 🏁 2. POST: รับผ้าเข้า (Receive / Check-in)
        // ==========================================
        [HttpPost("Receive")]
        public async Task<IActionResult> Receive([FromBody] TransportDto input)
        {
            var reader = await _context.Readers.Include(r => r.InstalledAtRoom).FirstOrDefaultAsync(r => r.ReaderId == input.ReaderId);
            if (reader == null) return BadRequest("ไม่พบข้อมูลเครื่องอ่าน RFID");

            var linens = await _context.Linens
                .Where(l => input.RfidCodes.Contains(l.RfidCode) && l.IsActive)
                .ToListAsync();

            if (!linens.Any()) return NotFound("ไม่พบผ้าที่ระบุในระบบ");

            var now = ThaiTime();
            var logList = new List<LinenLog>();
            
            // Logic ปลายทาง: ถ้าเครื่องอ่านติดตั้งที่ไหน ให้ถือว่าผ้านั้นไปอยู่ที่นั่น
            string newLocation = reader.InstalledAtRoom?.RoomName ?? reader.Location ?? "Unknown";

            foreach (var linen in linens)
            {
                // Requirement: ถึงปลายทาง -> สถานะ InUse (ใช้งาน) หรือ Available (เข้าคลัง)
                // สมมติ: ถ้าเข้า Ward -> InUse, ถ้าเข้า Stock -> Available
                string newStatus = "Available"; 
                if (reader.ReaderFunction == "WARD_RECEIVE") newStatus = "InUse";

                linen.Status = newStatus;
                linen.CurrentLocation = newLocation;
                linen.UpdatedAt = now;

                logList.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ReaderId = input.ReaderId,
                    StatusAfter = newStatus,
                    CreatedAt = now,
                    Description = $"รับเข้าที่ {newLocation}"
                });
            }

            // ถ้ามี RequestId -> ปิดจ็อบ
            if (input.RequestId.HasValue)
            {
                var req = await _context.Requests.FindAsync(input.RequestId.Value);
                if (req != null)
                {
                    req.Status = "Completed";
                    req.ArrivalDate = now;
                }
            }

            _context.LinenLogs.AddRange(logList);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"รับผ้าเข้าเรียบร้อย {linens.Count} รายการ", location = newLocation });
        }
    }
}