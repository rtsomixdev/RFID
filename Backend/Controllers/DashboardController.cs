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

        // Helper: เวลาไทย
        private DateTime ThaiTime() => DateTime.UtcNow.AddHours(7);

        [HttpGet("Stats")]
        public async Task<IActionResult> GetStats()
        {
            // ✅ ใช้เวลาไทยในการตัดรอบวัน
            var today = ThaiTime().Date; 

            var totalLinens = await _context.Linens.CountAsync(l => l.IsActive);

            var pendingRequests = await _context.Requests
                .Where(r => r.CurrentStatusId == 1)
                .CountAsync();

            var approvedToday = await _context.Requests
                .Where(r => r.CurrentStatusId == 2 && r.UpdatedAt >= today)
                .CountAsync();

            var damagedItems = await _context.RequestItems
                .Where(ri => ri.DamageReasonId != null)
                .CountAsync();

            return Ok(new { totalLinens, pendingRequests, approvedToday, damagedItems });
        }

        [HttpGet("ChartData")]
        public async Task<IActionResult> GetChartData()
        {
            var today = ThaiTime().Date;

            // --- A. Pie Chart ---
            var pieData = await _context.Linens
                .Include(l => l.Product)
                .GroupBy(l => l.Product.ProductName)
                .Select(g => new { name = g.Key, value = g.Count() })
                .OrderByDescending(x => x.value)
                .Take(5)
                .ToListAsync();

            // --- B. Daily Data (7 Days) ---
            var sevenDaysAgo = today.AddDays(-6);
            
            // ดึง Log ช่วง 7 วันมา (กรองที่ DB ก่อนเพื่อ performance)
            var weeklyLogs = await _context.LinenLogs
                .Where(l => l.Timestamp >= sevenDaysAgo)
                .ToListAsync();

            var dailyData = Enumerable.Range(0, 7).Select(i => {
                var date = sevenDaysAgo.AddDays(i);
                // กรองใน Memory (เทียบวันที่แบบตัดเวลา)
                var dayLogs = weeklyLogs
                    .Where(l => l.Timestamp.HasValue && l.Timestamp.Value.Date == date) 
                    .ToList();
                
                return new {
                    name = date.ToString("dd MMM", new CultureInfo("th-TH")),
                    use = dayLogs.Count(l => l.ActivityType == "ISSUE"),
                    wash = dayLogs.Count(l => l.ActivityType == "RETURN" || l.ActivityType == "WASH"),
                };
            }).ToList();

            // --- C. Monthly Data ---
            var sixMonthsAgo = today.AddMonths(-5);
            var requestLogs = await _context.Requests.Where(r => r.CreatedAt >= sixMonthsAgo).ToListAsync();
            var damageLogs = await _context.LinenLogs.Where(l => l.Timestamp >= sixMonthsAgo && l.ActivityType == "DAMAGE").ToListAsync();

            var monthsDataRaw = Enumerable.Range(0, 6).Select(i => {
                var d = sixMonthsAgo.AddMonths(i);
                var monthName = d.ToString("MMM", new CultureInfo("th-TH"));
                
                var reqCount = requestLogs.Count(r => r.CreatedAt.HasValue && r.CreatedAt.Value.Month == d.Month);
                var dmgCount = damageLogs.Count(l => l.Timestamp.HasValue && l.Timestamp.Value.Month == d.Month);
                
                return new { monthName, reqCount, dmgCount };
            }).ToList();

            var requestData = monthsDataRaw.Select(m => new { name = m.monthName, count = m.reqCount });
            var damagedData = monthsDataRaw.Select(m => new { name = m.monthName, count = m.dmgCount });

            // --- D. Yearly Data (กราฟใหญ่ด้านล่าง) ---
            var currentYear = today.Year;
            
            // ดึง Log ทั้งปีมา
            var yearlyLogsRaw = await _context.LinenLogs
                .Where(l => l.Timestamp.HasValue && l.Timestamp.Value.Year == currentYear)
                .ToListAsync();

            string[] thaiMonths = { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };
            
            var yearlyData = Enumerable.Range(1, 12).Select(m => new {
                name = thaiMonths[m],
                // นับรวมกิจกรรมทั้งหมดเป็น Transaction Volume
                value = yearlyLogsRaw.Count(l => l.Timestamp.Value.Month == m)
            }).ToList();

            return Ok(new { 
                pieData, 
                dailyData, 
                requestData, 
                damagedData, 
                yearlyData 
            });
        }
    }
}