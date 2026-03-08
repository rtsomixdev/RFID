using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการส่งออกและสร้างเอกสารรายงานเชิงสถิติของผ้า
    /// </summary>
    public class ReportService : IReportService
    {
        private readonly LinenDbContext _context;

        public ReportService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// คัดแยกความหมายของกิจกรรมว่าเป็นลักษณะการนำผ้าออกหรือไม่
        /// </summary>
        /// <param name="activity">ชื่องานกิจกรรมที่ต้องตรวจ</param>
        /// <returns>ตกลงว่ามีการนำสินค้าลดทอนไปสู่นอกพื้นที่หรือไม่</returns>
        private bool IsOutgoing(string? activity)
        {
            if (string.IsNullOrEmpty(activity)) return false;
            var outgoingTypes = new[] { "Wash", "Discard", "Request", "Move_Out", "SendingToWash" };
            return outgoingTypes.Contains(activity, StringComparer.OrdinalIgnoreCase);
        }

        /// <summary>
        /// รวบรวมข้อมูลสรุปความเคลื่อนไหวผ้าสำหรับออกรายงานตามช่วงเวลา
        /// </summary>
        /// <param name="start">วันตั้งต้นจัดเก็บ</param>
        /// <param name="end">วันสุดท้ายประมวล</param>
        /// <param name="type">หมวดหมู่งานหรือทุกประเภทกิจกรรม</param>
        /// <returns>แบบรวบตึงข้อมูลที่พร้อมทำรายงานทันที</returns>
        public async Task<(int Status, string? Message, object? Data)> GetMovementReportAsync(DateTime? start, DateTime? end, string? type)
        {
            var startDate = start ?? DateTime.Today.AddDays(-30);
            var endDate = end?.AddDays(1) ?? DateTime.Today.AddDays(1);

            try
            {
                var query = _context.LinenLogs
                    .Include(l => l.Linen)
                        .ThenInclude(p => p.Product)
                    .Where(x => x.CreatedAt >= startDate && x.CreatedAt < endDate);

                if (!string.IsNullOrEmpty(type) && type != "All")
                {
                    query = query.Where(x => x.ActivityType == type);
                }

                var rawLogs = await query.ToListAsync();

                // ลดรูปเพื่อรังสรรค์ประวัติการณ์สรุปเป็นก้อนรวม
                var groupedLogs = rawLogs
                    .GroupBy(x => new 
                    { 
                        TimeGroup = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"), 
                        Activity = x.ActivityType, 
                        ProductName = x.Linen?.Product?.ProductName ?? "Unknown",
                        From = x.FromLocation ?? "-",
                        To = x.ToLocation ?? "-"
                    })
                    .Select((g, index) => new
                    {
                        id = g.First().LogId, 
                        date = g.Key.TimeGroup,
                        type = g.Key.Activity, 
                        productName = g.Key.ProductName,
                        flow = $"{g.Key.From} -> {g.Key.To}", 
                        qty = IsOutgoing(g.Key.Activity) ? -g.Count() : g.Count(), 
                        user = "Auto System", 
                        description = string.Join(", ", g.Where(x => !string.IsNullOrEmpty(x.Description)).Select(x => x.Description).Distinct())
                    })
                    .OrderByDescending(x => x.date)
                    .ToList();

                return (200, null, groupedLogs);
            }
            catch (Exception ex)
            {
                return (500, "Error generating movement report: " + ex.Message, null);
            }
        }

        /// <summary>
        /// สร้างรายงานจัดรูปสินค้าผ้าที่กลายเป็นชำรุดเสียหายเพื่อพิจารณา
        /// </summary>
        /// <param name="start">จุดตั้งต้นช่วงเวลาค้นหา</param>
        /// <param name="end">จุดสิ้นสุดของขอบเขตเวลาตรวจพบ</param>
        /// <returns>ชุดข้อมูลที่แสดงบรรดาสินค้าชำรุดรอตรวจ</returns>
        public async Task<(int Status, string? Message, object? Data)> GetDamagedReportAsync(DateTime? start, DateTime? end)
        {
            var startDate = start ?? DateTime.MinValue;
            var endDate = end?.AddDays(1) ?? DateTime.MaxValue;

            try 
            {
                var data = await _context.Linens
                    .Include(l => l.Product)
                    .Where(l => l.IsActive == false 
                             && l.Status != "Available" 
                             && l.UpdatedAt >= startDate 
                             && l.UpdatedAt < endDate)
                    .OrderByDescending(l => l.UpdatedAt)
                    .Select(l => new 
                    {
                        Date = l.UpdatedAt.HasValue ? l.UpdatedAt.Value.ToString("yyyy-MM-dd HH:mm") : "-",
                        Product = l.Product.ProductName ?? "Unknown",
                        Category = l.Product.Category != null ? l.Product.Category.CategoryName : "-",
                        RFID = l.RfidCode,
                        Status = l.Status, 
                        Location = l.CurrentLocation 
                    })
                    .ToListAsync();

                return (200, null, data);
            }
            catch (Exception ex)
            {
                return (500, "Error generating damaged report: " + ex.Message, null);
            }
        }
    }
}
