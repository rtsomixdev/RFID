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
    /// บริการติดตามพัสดุรับเข้าส่งออกสำหรับการขนส่งระหว่างจุด
    /// </summary>
    public class TransportService : ITransportService
    {
        private readonly LinenDbContext _context;

        public TransportService(LinenDbContext context)
        {
            _context = context;
        }

        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        /// <summary>
        /// ออกตั๋วส่งของและสร้างประวัติขาออกออกจากที่จัดเก็บ
        /// </summary>
        /// <param name="input">รวมกลุ่มรายการพัสดุอ้างอิงรหัสเครื่องอ่าน</param>
        /// <returns>สรุปยอดรหัสสินค้าที่ขึ้นสถานะกำลังขนส่งสำเร็จ</returns>
        public async Task<(int Status, string? Message, string? ResultStatus)> DispatchAsync(TransportDto input)
        {
            var reader = await _context.Readers.FindAsync(input.ReaderId);
            if (reader == null) return (400, "ไม่พบข้อมูลเครื่องอ่าน RFID", null);

            var linens = await _context.Linens
                .Where(l => input.RfidCodes.Contains(l.RfidCode) && l.IsActive)
                .ToListAsync();

            if (!linens.Any()) return (404, "ไม่พบผ้าที่ระบุในระบบ", null);

            var now = ThaiTime();
            var logList = new List<LinenLog>();

            foreach (var linen in linens)
            {
                linen.Status = "InTransit";
                linen.CurrentLocation = "InTransit"; 
                linen.UpdatedAt = now;

                logList.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ReaderId = input.ReaderId,
                    StatusAfter = "InTransit",
                    CreatedAt = now,
                    Description = $"ส่งออกจาก {reader.Location ?? reader.ReaderName}"
                });
            }

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

            return (200, $"บันทึกการส่งออก {linens.Count} รายการ", "InTransit");
        }

        /// <summary>
        /// ประทับรับสินค้าที่ปลายทางเพื่อเคลียร์สถานะระหว่างขนส่ง
        /// </summary>
        /// <param name="input">ชุดแท็กสินค้าและรหัสเครื่องสแกนปลายทางที่อ่านได้</param>
        /// <returns>จำนวนรายการที่ถึงที่หมายครบถ้วนพร้อมตำแหน่งชี้พิกัดปัจจุบัน</returns>
        public async Task<(int Status, string? Message, string? Location)> ReceiveAsync(TransportDto input)
        {
            var reader = await _context.Readers.Include(r => r.InstalledAtRoom).FirstOrDefaultAsync(r => r.ReaderId == input.ReaderId);
            if (reader == null) return (400, "ไม่พบข้อมูลเครื่องอ่าน RFID", null);

            var linens = await _context.Linens
                .Where(l => input.RfidCodes.Contains(l.RfidCode) && l.IsActive)
                .ToListAsync();

            if (!linens.Any()) return (404, "ไม่พบผ้าที่ระบุในระบบ", null);

            var now = ThaiTime();
            var logList = new List<LinenLog>();
            
            string newLocation = reader.InstalledAtRoom?.RoomName ?? reader.Location ?? "Unknown";

            foreach (var linen in linens)
            {
                string newStatus = "Available"; 
                // หากเครื่องรับบทบาทรับเข้าวอร์ดให้ถือว่ากำลังถูกใช้งานจริงในลูปพื้นที่
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

            return (200, $"รับผ้าเข้าเรียบร้อย {linens.Count} รายการ", newLocation);
        }
    }
}
