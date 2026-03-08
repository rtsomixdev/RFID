using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Controllers;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการผ้าตามโรงซักและงานซักรีด
    /// </summary>
    public class LaundryService : ILaundryService
    {
        private readonly LinenDbContext _context;

        public LaundryService(LinenDbContext context)
        {
            _context = context;
        }

        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        /// <summary>
        /// ตรวจสอบประวัติข้อมูลผ้าด้วยรหัสผ่านเครื่องสแกน
        /// </summary>
        /// <param name="rfid">รหัสความถี่วิทยุประจำผืนผ้า</param>
        /// <returns>รายละเอียดที่พบของสินค้าผ้าพร้อมชนิดสินค้า</returns>
        public async Task<(int Status, string? Message, object? Data)> CheckLinenAsync(string rfid)
        {
            var linen = await _context.Linens
                .Include(l => l.Product)
                .FirstOrDefaultAsync(l => l.RfidCode == rfid);

            if (linen == null) return (404, "ไม่พบข้อมูล RFID นี้ในระบบ", null);

            var data = new 
            {
                rfid = linen.RfidCode,
                productName = linen.Product?.ProductName ?? "ไม่ระบุชื่อสินค้า",
                status = linen.Status
            };
            return (200, null, data);
        }

        /// <summary>
        /// ทำรายการส่งผ้าสกปรกและผ้าติดเชื้อเข้าสู่ระบบโรงซัก
        /// </summary>
        /// <param name="request">โครงข้อมูลสำหรับร้องขอคำสั่งซักผ้า</param>
        /// <returns>สถานะแจ้งยืนยันชุดจำนวนผ้าที่ลงทะเบียนให้ซัก</returns>
        public async Task<(int Status, string? Message, int Count)> SendToWashAsync(LaundryRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return (400, "กรุณาระบุรายการ RFID", 0);

            var linens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return (404, "ไม่พบข้อมูลผ้าในระบบ", 0);

            // คัดหน้าสัมผัสของผ้าที่จัดว่าส่งซักได้
            var allowStatuses = new[] { "In Use", "Dirty", "Stained", "Infection" };
            var invalidItems = linens.Where(l => !allowStatuses.Contains(l.Status)).ToList();

            if (invalidItems.Any())
            {
                var detail = invalidItems.First();
                string reason = "สถานะไม่ถูกต้อง";
                
                if (detail.Status == "Available") reason = "ผ้าสะอาดอยู่แล้ว (Available)";
                else if (detail.Status == "Washing") reason = "ผ้ากำลังซักอยู่ (Washing)";
                else if (detail.Status == "Retired") reason = "ผ้าจำหน่ายทิ้ง/เป็นรู (Retired)";

                return (400, $"ส่งซักไม่ได้! RFID: {detail.RfidCode} สถานะคือ '{detail.Status}' ({reason})", 0);
            }

            // บันทึกปรับสภาวะข้อมูลผ้าเพื่อส่งต่อไปที่เครื่องซัก
            foreach (var linen in linens)
            {
                linen.Status = "Washing";
                linen.VendorId = request.VendorId;
                linen.UpdatedAt = ThaiTime(); 

                _context.LinenLogs.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ActivityType = "WASH", 
                    Description = $"ส่งซักที่ร้าน ID: {request.VendorId}",
                    FromLocation = linen.CurrentLocation ?? "Ward",
                    ToLocation = "Laundry",
                    Timestamp = ThaiTime() 
                });
            }

            await _context.SaveChangesAsync();
            return (200, $"ส่งซักเรียบร้อย {linens.Count} รายการ", linens.Count);
        }

        /// <summary>
        /// ยืนยันผ้าที่รับการทำความสะอาดเข้าคลังพร้อมใช้
        /// </summary>
        /// <param name="request">ชุดข้อมูลโต้ตอบของผ้าที่ผ่านการซักเสร็จสิ้น</param>
        /// <returns>สถานะความยินยอมรับของเข้าสู่คลังผ้า</returns>
        public async Task<(int Status, string? Message, int Count)> ReceiveCleanAsync(LaundryRequestDto request)
        {
            if (request.RfidCodes == null || !request.RfidCodes.Any())
                return (400, "กรุณาระบุรายการ RFID", 0);

            var linens = await _context.Linens
                .Where(l => request.RfidCodes.Contains(l.RfidCode))
                .ToListAsync();

            if (!linens.Any()) return (404, "ไม่พบข้อมูลผ้าในระบบ", 0);

            // คัดกรองสถานะหากยังไม่ถูกแจ้งสถานะซักมาก่อน
            var invalidItems = linens.Where(l => l.Status != "Washing").ToList();

            if (invalidItems.Any())
            {
                var detail = invalidItems.First();
                return (400, $"รับคืนไม่ได้! RFID: {detail.RfidCode} สถานะคือ '{detail.Status}' (ต้องเป็น Washing เท่านั้น)", 0);
            }

            // จัดสภาพปรกติปรับเลขรอบการซัก
            foreach (var linen in linens)
            {
                linen.Status = "Available"; 
                linen.WashCount += 1;
                linen.LastWashDate = ThaiTime(); 
                linen.VendorId = null;
                linen.CurrentLocation = "Stock";
                linen.UpdatedAt = ThaiTime(); 

                _context.LinenLogs.Add(new LinenLog
                {
                    LinenId = linen.LinenId,
                    ActivityType = "RETURN", 
                    Description = "รับผ้าสะอาดกลับเข้าคลัง",
                    FromLocation = "Laundry",
                    ToLocation = "Stock",
                    Timestamp = ThaiTime() 
                });
            }

            await _context.SaveChangesAsync();
            return (200, $"รับผ้ากลับเรียบร้อย {linens.Count} รายการ", linens.Count);
        }

        /// <summary>
        /// แยกประเภทของสินค้าผ้าตามสถานะเพื่อทำปฏิบัติการเฉพาะเจาะจง
        /// </summary>
        /// <param name="mode">คำสั่งรูปแบบการดำเนินการที่ต้องการใช้หาตำแหน่งข้อมูล</param>
        /// <returns>กลุ่มย่อยของผ้าที่มีสิทธิเข้าทางกรอบการตรวจสอบ</returns>
        public async Task<(int Status, IEnumerable<object>? Data)> GetCandidatesAsync(string mode)
        {
            var query = _context.Linens.Include(l => l.Product).AsQueryable();

            if (mode == "send") 
            {
                // ตรวจหาผ้าเปื้อนที่ส่งทำความสะอาดได้
                string[] allowStatuses = { "In Use", "Dirty", "Stained", "Infection" };
                query = query.Where(l => allowStatuses.Contains(l.Status));
            }
            else if (mode == "receive") 
            {
                // ตรวจหาผ้าที่อยู่ระหว่างการจัดการซักล้าง
                query = query.Where(l => l.Status == "Washing");
            }
            else 
            {
                return (400, null);
            }

            var list = await query.Select(l => new {
                l.RfidCode,
                ProductName = l.Product.ProductName, 
                l.Status
            }).ToListAsync();

            return (200, list);
        }

        /// <summary>
        /// เรียกข้อมูลสถานการณ์ผ้าที่อยู่ระดับปฏิบัติการส่งซักทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลจัดกลุ่มของผ้าเป้าหมายรวมกับโรงซักพันธมิตร</returns>
        public async Task<IEnumerable<object>> GetWashingListAsync()
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
                .OrderByDescending(l => l.SentDate)
                .ToListAsync();
            return washingList;
        }

        /// <summary>
        /// ล้มเลิกข้อมูลผ้าที่ค้างอยู่ในโรงซักกรณีที่อาจส่งผิดพลาด
        /// </summary>
        /// <param name="rfidCodes">พวงรหัสของชุดผ้าทั้งหมด</param>
        /// <returns>อัตราความสำเร็จพร้อมระบุยอดสะสมจากการเปลี่ยนสถานะ</returns>
        public async Task<(int Status, string? Message, int Count)> CancelLaundryAsync(List<string> rfidCodes)
        {
            var linens = await _context.Linens.Where(l => rfidCodes.Contains(l.RfidCode)).ToListAsync();
            if (!linens.Any()) return (404, "ไม่พบรายการ", 0);
            
            // ยกเลิกบัญชีก้อนรายการผ้ากลับไปเป็นสกปรกปกติเพื่อลงซักใหม่
            foreach (var linen in linens)
            {
                if (linen.Status == "Washing")
                {
                    linen.Status = "Dirty"; 
                    linen.VendorId = null;
                    linen.UpdatedAt = ThaiTime(); 
                    
                    _context.LinenLogs.Add(new LinenLog
                    {
                        LinenId = linen.LinenId,
                        ActivityType = "CANCEL_WASH", 
                        Description = "ยกเลิกการส่งซัก",
                        FromLocation = "Laundry",
                        ToLocation = "Ward",
                        Timestamp = ThaiTime()
                    });
                }
            }
            await _context.SaveChangesAsync();
            return (200, $"ยกเลิกรายการเรียบร้อย {linens.Count} รายการ", linens.Count);
        }
    }
}
