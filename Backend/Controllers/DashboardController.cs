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
        // 1. GET STATS (ตัวเลข 4 กล่องด้านบน)
        // =============================================
        [HttpGet("Stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var today = ThaiTime().Date;

                // 1. ดึง Linen ทั้งหมดที่ Active
                var allLinens = await _context.Linens
                    .Where(l => l.IsActive == true)
                    .Select(l => new { l.Status, l.RegisteredAt }) 
                    .ToListAsync();

                // 2. นับยอดผ้าใหม่ 
                var startOfDayUtc = DateTime.UtcNow.Date; 
                var newLinenToday = allLinens.Count(l => l.RegisteredAt >= startOfDayUtc);

                // 3. ดึงจำนวนคำร้องที่รออนุมัติ
                var pendingRequests = await _context.Requests
                    .CountAsync(r => r.Status == "Pending" || r.Status == "Waiting");

                var stats = new
                {
                    totalLinen = allLinens.Count,
                    newLinenToday = newLinenToday,
                    
                    washing = allLinens.Count(l => 
                        l.Status == "Washing" || l.Status == "SendingToLaundry" || l.Status == "In Laundry" || 
                        l.Status == "กำลังซัก" || l.Status == "ส่งซัก"),
                    
                    available = allLinens.Count(l => 
                        l.Status == "Available" || l.Status == "Stock" || l.Status == "พร้อมใช้"),
                    
                    pendingRequests = pendingRequests,
                    
                    damaged = allLinens.Count(l => 
                        l.Status == "Damaged" || l.Status == "Repairing" || l.Status == "ชำรุด"),
                    
                    disposed = allLinens.Count(l => 
                        l.Status == "Discarded" || l.Status == "Disposed" || l.Status == "จำหน่ายออก")
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Stats Error: " + ex.Message });
            }
        }

        // =============================================
        // 2. GET CHART DATA (ข้อมูลกราฟทั้งหมด)
        // =============================================
        [HttpGet("ChartData")]
        public async Task<IActionResult> GetChartData()
        {
            try
            {
                var now = ThaiTime();
                var sevenDaysAgo = now.AddDays(-6).Date;
                var sixMonthsAgo = now.AddMonths(-5);

                // --- A. Pie Chart (สัดส่วนผ้า) ---
                var pieData = await _context.Linens
                    .Include(l => l.Product)
                        .ThenInclude(p => p.Category)
                    .Where(l => l.IsActive == true && l.Product != null && l.Product.Category != null)
                    .GroupBy(l => l.Product.Category.CategoryName)
                    .Select(g => new { name = g.Key, value = g.Count() })
                    .OrderByDescending(x => x.value)
                    .Take(5)
                    .ToListAsync();

                // --- B. Daily Data (7 Days) - กราฟแท่งคู่ (จุดที่แก้) ---
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
                            return l.Timestamp.Value.AddHours(7).Date == date;
                        }).ToList();

                        return new
                        {
                            name = dateLabel,
                            // ✅ แก้ให้ครอบคลุมคำที่บันทึกจากการสแกน RFID (เช่น รับเข้า, ย้าย, ใช้งาน)
                            use = logsOfDay.Count(l => 
                                l.ActivityType == "Move" || 
                                l.ActivityType == "Restock" || 
                                l.ActivityType == "Dispatch" || 
                                l.ActivityType == "Receive" || 
                                l.ActivityType == "เบิกจ่าย"), 
                            
                            // ✅ แก้ให้ครอบคลุมการซัก
                            wash = logsOfDay.Count(l => 
                                l.ActivityType == "SendToWash" || 
                                l.ActivityType == "ReceiveWash" || 
                                l.ActivityType == "ส่งซัก")
                        };
                    })
                    .ToList();

                // --- C. Request Data (Monthly) ---
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
                        var rt = r.Value.AddHours(7);
                        return rt.Month == m.Month && rt.Year == m.Year;
                    })
                }).ToList();

                // --- D. Damaged Data (Monthly) ---
                var damageLogsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddMonths(-6) && 
                               (l.ActivityType == "Discard" || l.ActivityType == "Damage" || l.ActivityType == "ReportDamage"))
                    .Select(l => l.Timestamp)
                    .ToListAsync();

                var damagedData = monthsLabels.Select(m => new {
                    name = m.ToString("MMM", new CultureInfo("th-TH")),
                    count = damageLogsRaw.Count(t => {
                        if (!t.HasValue) return false;
                        var localTime = t.Value.AddHours(7);
                        return localTime.Month == m.Month && localTime.Year == m.Year;
                    })
                }).ToList();

                // --- E. Yearly Data ---
                var currentYear = now.Year;
                var yearlyLogsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddYears(-1))
                    .Select(l => l.Timestamp)
                    .ToListAsync();

                string[] thaiMonths = { "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." };
                
                var yearlyData = Enumerable.Range(1, 12).Select(month => new {
                    name = thaiMonths[month],
                    value = yearlyLogsRaw.Count(t => {
                        if (!t.HasValue) return false;
                        var localTime = t.Value.AddHours(7);
                        return localTime.Year == currentYear && localTime.Month == month;
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