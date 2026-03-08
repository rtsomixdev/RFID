using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Globalization;

namespace Backend.Services
{
    /// <summary>
    /// บริการสำหรับการคำนวณและสรุปข้อมูลที่ใช้แสดงผลบนหน้าแดชบอร์ด
    /// </summary>
    public class DashboardService : IDashboardService
    {
        private readonly LinenDbContext _context;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ DashboardService
        /// </summary>
        /// <param name="context">บริบทของฐานข้อมูล</param>
        public DashboardService(LinenDbContext context)
        {
            _context = context;
        }

        // อ่านเวลาตามเขตเวลาไทย (UTC+7)
        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        /// <summary>
        /// ดึงข้อมูลสถิติภาพรวมสำหรับแสดงในแดชบอร์ด
        /// </summary>
        /// <returns>ข้อมูลสถิติจำนวนรวมแยกตามสถานะ</returns>
        public async Task<object> GetStatsAsync()
        {
            var today = ThaiTime().Date;

            // รวบรวมข้อมูลหมวดหมู่ต่างๆ ที่จำเป็นต่อหน้าหลัก
            var totalLinen = await _context.Linens.CountAsync(l => l.IsActive == true);
            var newLinenToday = await _context.Linens.CountAsync(l => l.IsActive == true && l.RegisteredAt.Date == today);
            var washing = await _context.Linens.CountAsync(l => l.IsActive == true && 
                (l.Status.Contains("ซัก") || l.Status.Contains("Wash") || l.Status.Contains("Laundry")));
            var available = await _context.Linens.CountAsync(l => l.IsActive == true && 
                (l.Status == "พร้อมใช้" || l.Status == "Available" || l.Status == "Stock"));
            var pendingRequests = await _context.Requests.CountAsync(r => r.CurrentStatusId == 1 || r.Status == "Pending" || r.Status == "Waiting");
            var disposed = await _context.Linens.CountAsync(l => l.IsActive == false);

            return new
            {
                totalLinen = totalLinen,
                newLinenToday = newLinenToday,
                washing = washing,
                available = available,
                pendingRequests = pendingRequests,
                damaged = disposed, 
                disposed = disposed
            };
        }

        /// <summary>
        /// ประมวลผลและดึงข้อมูลสรุปสำหรับกราฟแสดงผลรูปแบบต่างๆ
        /// </summary>
        /// <returns>ชุดข้อมูลเพื่อวาดกราฟแบบจุด, กราฟเส้น, และกราฟวงกลม</returns>
        public async Task<object> GetChartDataAsync()
        {
            var now = ThaiTime();
            var sevenDaysAgo = now.AddDays(-6).Date;
            var sixMonthsAgo = now.AddMonths(-5);

            // ดึงสัดส่วนปริมาณผ้าแยกตามหมวดหมู่เพื่อแสดงกราฟวงกลม (Top 5)
            var pieData = await _context.Linens
                .Include(l => l.Product)
                    .ThenInclude(p => p.Category)
                .Where(l => l.IsActive == true && l.Product != null && l.Product.Category != null)
                .GroupBy(l => l.Product.Category.CategoryName)
                .Select(g => new { name = g.Key, value = g.Count() })
                .OrderByDescending(x => x.value)
                .Take(5)
                .ToListAsync();

            // รวบรวมข้อมูลล็อกในช่วง 7 วันที่ผ่านมา
            var logsRaw = await _context.LinenLogs
                .Where(l => l.Timestamp >= DateTime.UtcNow.AddDays(-8) || l.CreatedAt >= DateTime.UtcNow.AddDays(-8))
                .Select(l => new { l.ActivityType, l.Timestamp, l.CreatedAt })
                .ToListAsync();

            // สร้างข้อมูลสถิติรายวัน (ใช้งาน vs ส่งซัก) ใน 7 วันย้อนหลัง
            var dailyData = Enumerable.Range(0, 7)
                .Select(i => sevenDaysAgo.AddDays(i))
                .Select(date => 
                {
                    string dateLabel = date.ToString("dd MMM", new CultureInfo("th-TH"));
                    
                    var logsOfDay = logsRaw.Where(l => 
                    {
                        var logTime = l.Timestamp ?? l.CreatedAt; 
                        return logTime.Date == date; 
                    }).ToList();

                    return new
                    {
                        name = dateLabel,
                        use = logsOfDay.Count(l => 
                            l.ActivityType == "Move" || 
                            l.ActivityType == "Restock" || 
                            l.ActivityType == "Dispatch" || 
                            l.ActivityType == "Receive" || 
                            l.ActivityType == "เบิกจ่าย"), 
                        
                        wash = logsOfDay.Count(l => 
                            l.ActivityType == "SendToWash" || 
                            l.ActivityType == "ReceiveWash" || 
                            l.ActivityType == "ส่งซัก" ||
                            l.ActivityType == "WASH")
                    };
                })
                .ToList();

            // สถิติยอดคำร้องขอเบิกในช่วงเปรียบเทียบ 6 เดือนย้อนหลัง
            var requestRaw = await _context.Requests
                .Where(r => r.CreatedAt >= DateTime.UtcNow.AddMonths(-6))
                .Select(r => r.CreatedAt)
                .ToListAsync();

            var monthsLabels = Enumerable.Range(0, 6)
                .Select(i => sixMonthsAgo.AddMonths(i))
                .ToList();

            var requestData = monthsLabels.Select(m => new { 
                name = m.ToString("MMM", new CultureInfo("th-TH")),
                count = requestRaw.Count(r => {
                    if (!r.HasValue) return false; 
                    return r.Value.Month == m.Month && r.Value.Year == m.Year;
                })
            }).ToList();

            // เตรียมข้อมูลการทิ้งและผ้าที่เสียหายในช่วง 6 เดือนที่ผ่านมา
            var damageLogsRaw = await _context.LinenLogs
                .Where(l => l.Timestamp >= DateTime.UtcNow.AddMonths(-6) || l.CreatedAt >= DateTime.UtcNow.AddMonths(-6))
                .Select(l => new { l.ActivityType, l.Timestamp, l.CreatedAt })
                .ToListAsync();

            var validDamageTypes = new[] { "DISCARD", "DAMAGE", "จำหน่ายออก", "ชำรุด", "สูญหาย" };
            var filteredDamageLogs = damageLogsRaw
                .Where(l => !string.IsNullOrEmpty(l.ActivityType) && 
                            validDamageTypes.Any(v => l.ActivityType.ToUpper().Contains(v)))
                .ToList();

            var damagedData = monthsLabels.Select(m => new {
                name = m.ToString("MMM", new CultureInfo("th-TH")),
                count = filteredDamageLogs.Count(t => {
                    var logTime = t.Timestamp ?? t.CreatedAt; 
                    return logTime.Month == m.Month && logTime.Year == m.Year;
                })
            }).ToList();

            // ดึงสถิติภาพรวมเทียบแบบรายปีรวม 12 เดือน 
            var currentYear = now.Year;
            var yearlyLogsRaw = await _context.LinenLogs
                .Where(l => l.Timestamp >= DateTime.UtcNow.AddYears(-1) || l.CreatedAt >= DateTime.UtcNow.AddYears(-1))
                .Select(l => new { l.Timestamp, l.CreatedAt })
                .ToListAsync();

            string[] thaiMonths = { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };
            
            var yearlyData = Enumerable.Range(1, 12).Select(month => new {
                name = thaiMonths[month],
                value = yearlyLogsRaw.Count(t => {
                    var logTime = t.Timestamp ?? t.CreatedAt;
                    return logTime.Year == currentYear && logTime.Month == month;
                })
            }).ToList();

            return new
            {
                pieData,
                dailyData,
                requestData,
                damagedData,
                yearlyData
            };
        }
    }
}
