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
    /// บริการรวบรวมตรรกะสำหรับการขอเบิกผ้าและการตรวจเช็คสต็อกก่อนการจัดส่ง
    /// </summary>
    public class RequestService : IRequestService
    {
        private readonly LinenDbContext _context;

        public RequestService(LinenDbContext context)
        {
            _context = context;
        }

        private DateTime ThaiTime()
        {
            return DateTime.UtcNow.AddHours(7);
        }

        /// <summary>
        /// เรียกรายการใบเบิกทั้งหมดเพื่อแสดงภาพรวมของกระบวนการ
        /// </summary>
        /// <returns>ชุดข้อมูลเอกสารเบิกพร้อมรายการสินค้าและผู้ขอ</returns>
        public async Task<IEnumerable<Request>> GetRequestsAsync()
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

        /// <summary>
        /// สืบหาใบเบิกโดยละเอียดแจกแจงเป้าหมายปลายทางชัดเจน
        /// </summary>
        /// <param name="id">เลขอ้างอิงใบขอเบิก</param>
        /// <returns>รายละเอียดที่ระบุของคำขอนั้น</returns>
        public async Task<Request?> GetRequestAsync(int id)
        {
            return await _context.Requests
                .Include(r => r.RequestItems)
                    .ThenInclude(ri => ri.Product)
                        .ThenInclude(p => p.Category)
                .Include(r => r.RequestedByUser)
                .Include(r => r.TargetWard)
                .Include(r => r.CurrentStatus)
                .FirstOrDefaultAsync(r => r.RequestId == id);
        }

        /// <summary>
        /// ตรวจสอบยอดสต็อกคงเหลือที่มีประสิทธิภาพก่อนอนุมัติสินค้า
        /// </summary>
        /// <param name="productId">รหัสผลิตภัณฑ์ผ้า</param>
        /// <returns>จำนวนสินค้าที่มีว่างให้เบิกหักลบส่วนรอจ่าย</returns>
        public async Task<object> CheckStockAsync(int productId)
        {
            var physicalStock = await _context.Linens
                .CountAsync(l => l.ProductId == productId && l.IsActive == true && 
                                (l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"));

            var pendingStock = await _context.RequestItems
                .Where(ri => ri.ProductId == productId && (ri.Request.CurrentStatusId == 1 || ri.Request.Status == "Pending"))
                .SumAsync(ri => ri.QuantityRequested); 

            var effectiveStock = physicalStock - pendingStock;
            if (effectiveStock < 0) effectiveStock = 0;

            return new { productId, available = effectiveStock };
        }

        /// <summary>
        /// สร้างคำขอเบิกของใหม่ลงระบบพร้อมกรองสินค้าคงคลัง
        /// </summary>
        /// <param name="request">ชุดคำสั่งขอของทั้งหมด</param>
        /// <returns>ใบเบิกที่ตั้งรหัสใหม่ส่งเข้าระบบเรียบร้อย</returns>
        public async Task<(int Status, string? Message, Request? Item)> PostRequestAsync(Request request)
        {
            if (request.RequestItems == null || !request.RequestItems.Any())
            {
                return (400, "กรุณาระบุรายการผ้าอย่างน้อย 1 รายการ", null);
            }

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
                    return (400, $"สินค้า ID {item.ProductId} มีไม่พอ! (ว่าง: {physicalStock}, รออนุมัติ: {pendingStock}, คงเหลือให้เบิก: {availableStock})", null);
                }
            }
            
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
            
            request.CreatedAt = now;
            request.UpdatedAt = now;
            if (request.CurrentStatusId == 0) request.CurrentStatusId = 1; 
            request.Status = "Pending";

            if (string.IsNullOrEmpty(request.Note)) request.Note = "-";

            _context.Requests.Add(request);

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
                return (500, "Save Error: " + msg, null);
            }

            return (201, null, request);
        }

        /// <summary>
        /// เปลี่ยนแปลงสถานะของการขอผ้าและตัดสินใจอนุมัติ
        /// </summary>
        /// <param name="id">ไอดีใบเบิก</param>
        /// <param name="request">ข้อมูลและท่าทีการตอบรับของคำสั่งเบิก</param>
        /// <returns>ผลการอนุมัติและแจ้งเตือนถ้าสต็อกวิกฤต</returns>
        public async Task<(int Status, string? Message)> PutRequestAsync(int id, Request request)
        {
            if (id != request.RequestId) return (400, "ID ไม่ตรงกัน");

            var existingRequest = await _context.Requests
                .Include(r => r.TargetWard)
                .FirstOrDefaultAsync(r => r.RequestId == id);
                
            if (existingRequest == null) return (404, "Not Found");

            var oldStatusId = existingRequest.CurrentStatusId;
            var newStatusId = request.CurrentStatusId;

            existingRequest.CurrentStatusId = newStatusId;
            existingRequest.Status = newStatusId switch
            {
                1 => "Pending",
                2 => "Approved",
                3 => "Rejected",
                4 => "Dispatched",
                _ => "Unknown"
            };
            existingRequest.UpdatedAt = ThaiTime(); 

            if (newStatusId == 2 && oldStatusId != 2)
            {
                var requestItems = await _context.RequestItems.Where(ri => ri.RequestId == id).ToListAsync();
                
                var minStockSetting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == "GlobalMinStock");
                int minStockLevel = 20;
                if (minStockSetting != null && int.TryParse(minStockSetting.Value, out int parsedValue))
                {
                    minStockLevel = parsedValue;
                }

                foreach (var item in requestItems)
                {
                    var totalAvailable = await _context.Linens
                        .CountAsync(l => l.ProductId == item.ProductId && l.IsActive == true && 
                                        (l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"));

                    var remainingStock = totalAvailable - item.QuantityRequested;
                    if (remainingStock <= minStockLevel)
                    {
                        var productInfo = await _context.Products.FindAsync(item.ProductId);
                        string pName = productInfo?.ProductName ?? "ไม่ทราบชื่อสินค้า";

                        var noti = new Notification
                        {
                            RoleId = 1, 
                            Title = "⚠️ แจ้งเตือนสต็อกผ้าต่ำ",
                            Message = $"ผ้า {pName} คงเหลือ {remainingStock} ชิ้น (ต่ำกว่าเกณฑ์ที่กำหนด {minStockLevel} ชิ้น)",
                            Type = "WARNING",
                            IsRead = false,
                            LinkUrl = "/linen",
                            CreatedAt = ThaiTime()
                        };
                        _context.Notifications.Add(noti);
                    }
                }
            }

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
                    Description = $"คำร้อง {existingRequest.RequestCode} ถูกเปลี่ยนสถานะเอกสารเป็น '{statusText}'",
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
                if (!_context.Requests.Any(e => e.RequestId == id)) return (404, "Not Found");
                else throw;
            }

            return (204, null);
        }

        /// <summary>
        /// แจ้งปรับวันเวลาและการดำเนินการส่งสินค้าสำหรับระบุการเดินทาง
        /// </summary>
        /// <param name="id">รหัสเอกสารการเบิก</param>
        /// <param name="dto">ข้อมูลแทรกรวมระยะการเดินทาง</param>
        /// <returns>ข้อความสรุปการเดินทางผ้าที่เปลี่ยนผ่านสถานะจัดส่ง</returns>
        public async Task<(int Status, string? Message, object? Data)> UpdateTrackingAsync(int id, UpdateRequestTrackingDto dto)
        {
            var request = await _context.Requests.FindAsync(id);
            if (request == null) return (404, "ไม่พบใบเบิกนี้", null);

            var oldStatusId = request.CurrentStatusId;
            request.CurrentStatusId = dto.NewStatusId;
            
            if (!string.IsNullOrEmpty(dto.TrackingNote))
            {
                request.Status = dto.TrackingNote; 
            }

            var currentTime = ThaiTime(); 

            if (dto.NewStatusId == 4) 
            {
                request.DispatchDate = currentTime;
            }
            else if (dto.NewStatusId == 5) 
            {
                request.ArrivalDate = currentTime;
            }

            request.UpdatedAt = currentTime;

            var log = new SystemLog
            {
                UserId = request.RequestedByUserId, 
                ActionType = "UPDATE_TRACKING",
                Description = $"คำร้อง {request.RequestCode} อัปเดตการจัดส่ง: Status={dto.NewStatusId}, Note={dto.TrackingNote ?? "-"}",
                CreatedAt = currentTime
            };
            _context.SystemLogs.Add(log);

            await _context.SaveChangesAsync();

            return (200, "อัปเดตสถานะการจัดส่งเรียบร้อย", new { 
                dispatchTime = request.DispatchDate,
                arrivalTime = request.ArrivalDate,
                trackingNote = request.Status
            });
        }

        /// <summary>
        /// ล้มเลิกคำขอที่กำลังตั้งรอการอนุมัติ
        /// </summary>
        /// <param name="id">ไอดีของรายการเบิกในระบบ</param>
        /// <returns>ความก้าวหน้ายกเลิกคำร้องไปสู่บัญชีดำทิ้ง</returns>
        public async Task<(int Status, string? Message)> CancelRequestAsync(int id)
        {
            var request = await _context.Requests.FindAsync(id);
            if (request == null) return (404, "Not Found");

            request.CurrentStatusId = 99; 
            request.Status = "Cancelled";
            request.UpdatedAt = ThaiTime();

            var log = new SystemLog
            {
                UserId = request.RequestedByUserId,
                ActionType = "CANCEL_REQUEST", 
                Description = $"ยกเลิกเอกสารคำร้อง {request.RequestCode}",
                CreatedAt = ThaiTime()
            };
            _context.SystemLogs.Add(log);

            await _context.SaveChangesAsync();

            return (200, $"ยกเลิกคำร้อง {request.RequestCode} เรียบร้อยแล้ว (สถานะเป็น Cancelled)");
        }
    }
}
