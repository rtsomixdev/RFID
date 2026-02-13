using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Globalization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public DashboardController(LinenDbContext context)
        {
            _context = context;
        }

        // Helper: เวลาไทย (UTC+7)
        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        // =============================================
        // 1. GET STATS
        // =============================================
        [HttpGet("Stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var today = ThaiTime().Date;

                // 1. ดึง Linen ทั้งหมด
                var allLinens = await _context.Linens
                    .Where(l => l.IsActive == true)
                    .Select(l => new { l.Status }) 
                    .ToListAsync();

                // 2. นับยอดผ้าใหม่จาก Log
                var newLinenCount = await _context.LinenLogs
                    .CountAsync(l => l.ActivityType == "IMPORT" && l.Timestamp >= today);

                var pendingRequests = await _context.Requests
                    .CountAsync(r => r.Status == "Pending" || r.CurrentStatusId == 1);

                var stats = new
                {
                    totalLinen = allLinens.Count,
                    newLinenToday = newLinenCount,
                    washing = allLinens.Count(l => l.Status == "Washing" || l.Status == "In Laundry"),
                    available = allLinens.Count(l => l.Status == "Available"),
                    pendingRequests = pendingRequests,
                    damaged = allLinens.Count(l => l.Status == "Damaged" || l.Status == "Repairing"),
                    disposed = allLinens.Count(l => l.Status == "Discarded" || l.Status == "Disposed")
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Stats Error: " + ex.Message });
            }
        }

        // =============================================
        // 2. GET CHART DATA
        // =============================================
        [HttpGet("ChartData")]
        public async Task<IActionResult> GetChartData()
        {
            try
            {
                var now = ThaiTime();
                var sevenDaysAgo = now.AddDays(-6).Date;
                var sixMonthsAgo = now.AddMonths(-5);

                // --- A. Pie Chart ---
                var pieData = await _context.Linens
                    .Include(l => l.Product)
                        .ThenInclude(p => p.Category)
                    .Where(l => l.IsActive == true && l.Product != null && l.Product.Category != null)
                    .GroupBy(l => l.Product.Category.CategoryName)
                    .Select(g => new { name = g.Key, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .Take(5)
                    .ToListAsync();

                // --- B. Daily Data (7 Days) ---
                var logsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddDays(-8))
                    .Select(l => new { l.ActivityType, l.Timestamp })
                    .ToListAsync();

                var dailyData = Enumerable.Range(0, 7)
                    .Select(i => sevenDaysAgo.AddDays(i))
                    .Select(date => 
                    {
                        string dateLabel = date.ToString("dd MMM", new CultureInfo("th-TH"));
                        
                        var logsOfDay = logsRaw.Where(l => 
                        {
                            if (!l.Timestamp.HasValue) return false;
                            // ✅ แก้จุดเสี่ยง: ใช้ .Value เพื่อดึงค่า DateTime ออกมาจาก DateTime?
                            return l.Timestamp.Value.AddHours(7).Date == date;
                        }).ToList();

                        return new
                        {
                            name = dateLabel,
                            use = logsOfDay.Count(l => l.ActivityType == "ISSUE" || l.ActivityType == "Use"),
                            wash = logsOfDay.Count(l => l.ActivityType == "WASH" || l.ActivityType == "Wash")
                        };
                    })
                    .ToList();

                // --- C. Request Data (Monthly) ---
                var requestRaw = await _context.Requests
                    .Where(r => r.CreatedAt >= DateTime.UtcNow.AddMonths(-6))
                    .Select(r => r.CreatedAt) // CreatedAt เป็น DateTime?
                    .ToListAsync();

                var monthsLabels = Enumerable.Range(0, 6)
                    .Select(i => sixMonthsAgo.AddMonths(i))
                    .ToList();

                var requestData = monthsLabels.Select(m => new { 
                    name = m.ToString("MMM", new CultureInfo("th-TH")),
                    count = requestRaw.Count(r => {
                         // 🔥🔥🔥 แก้ Error ตรงนี้ครับ 🔥🔥🔥
                         // เช็คก่อนว่ามีค่าไหม (!HasValue) ถ้าไม่มีให้ข้าม
                         if (!r.HasValue) return false; 
                         
                         // ใช้ .Value.AddHours() แทน .AddHours() เฉยๆ
                         var rt = r.Value.AddHours(7);
                         return rt.Month == m.Month && rt.Year == m.Year;
                    })
                }).ToList();

                // --- D. Damaged Data (Monthly) ---
                var damageLogsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddMonths(-6) && 
                               (l.ActivityType == "DISCARD" || l.ActivityType == "DAMAGE"))
                    .Select(l => l.Timestamp)
                    .ToListAsync();

                var damagedData = monthsLabels.Select(m => new {
                    name = m.ToString("MMM", new CultureInfo("th-TH")),
                    count = damageLogsRaw.Count(t => {
                        // 🔥🔥🔥 แก้ให้ปลอดภัยเหมือนกัน 🔥🔥🔥
                        if (!t.HasValue) return false;
                        
                        var localTime = t.Value.AddHours(7);
                        return localTime.Month == m.Month && localTime.Year == m.Year;
                    })
                }).ToList();

                // --- E. Yearly Data ---
                var yearlyLogsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddYears(-1))
                    .Select(l => l.Timestamp)
                    .ToListAsync();

                string[] thaiMonths = { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };
                
                var yearlyData = Enumerable.Range(1, 12).Select(month => new {
                    name = thaiMonths[month],
                    value = yearlyLogsRaw.Count(t => {
                        // 🔥🔥🔥 แก้ให้ปลอดภัยเหมือนกัน 🔥🔥🔥
                        if (!t.HasValue) return false;

                        var localTime = t.Value.AddHours(7);
                        return localTime.Year == now.Year && localTime.Month == month;
                    })
                }).ToList();

                return Ok(new
                {
                    pieData,
                    dailyData,
                    requestData,
                    damagedData,
                    yearlyData
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Chart Data Error: " + ex.Message });
            }
        }
    }
}