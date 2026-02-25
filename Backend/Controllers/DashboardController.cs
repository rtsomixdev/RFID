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

                // 1. นับจำนวนผ้าทั้งหมดที่ยัง Active
                var totalLinen = await _context.Linens.CountAsync(l => l.IsActive == true);

                // 2. นับผ้าใหม่ของวันนี้
                var newLinenToday = await _context.Linens.CountAsync(l => l.IsActive == true && l.RegisteredAt.Date == today);

                // 3. สถานะกำลังซัก
                var washing = await _context.Linens.CountAsync(l => l.IsActive == true && 
                    (l.Status.Contains("ซัก") || l.Status.Contains("Wash") || l.Status.Contains("Laundry")));

                // 4. สถานะพร้อมใช้งาน
                var available = await _context.Linens.CountAsync(l => l.IsActive == true && 
                    (l.Status == "พร้อมใช้" || l.Status == "Available" || l.Status == "Stock"));

                // 5. คำร้องรออนุมัติ
                var pendingRequests = await _context.Requests.CountAsync(r => r.CurrentStatusId == 1 || r.Status == "Pending" || r.Status == "Waiting");

                // ✅ 6. แก้ไข: นับผ้าที่ถูกจำหน่ายออก/ชำรุด โดยเช็คจากผ้าที่ IsActive == false
                var disposed = await _context.Linens.CountAsync(l => l.IsActive == false);

                var stats = new
                {
                    totalLinen = totalLinen,
                    newLinenToday = newLinenToday,
                    washing = washing,
                    available = available,
                    pendingRequests = pendingRequests,
                    damaged = disposed, // นำยอดที่ตัดจำหน่ายมาใส่กล่องแจ้งชำรุดสีแดง
                    disposed = disposed
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

                // --- B. Daily Data (7 Days) - กราฟแท่งคู่ ---
                var logsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddDays(-8) || l.CreatedAt >= DateTime.UtcNow.AddDays(-8))
                    .Select(l => new { l.ActivityType, l.Timestamp, l.CreatedAt })
                    .ToListAsync();

                var dailyData = Enumerable.Range(0, 7)
                    .Select(i => sevenDaysAgo.AddDays(i))
                    .Select(date => 
                    {
                        string dateLabel = date.ToString("dd MMM", new CultureInfo("th-TH"));
                        
                        var logsOfDay = logsRaw.Where(l => 
                        {
                            var logTime = l.Timestamp ?? l.CreatedAt; 
                            return logTime.Date == date; // ตัด AddHours ออกเพราะ DB เซฟเป็นเวลาไทยไปแล้ว
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
                        return r.Value.Month == m.Month && r.Value.Year == m.Year;
                    })
                }).ToList();

                // --- D. Damaged Data (Monthly) กราฟผ้าชำรุด ---
                var damageLogsRaw = await _context.LinenLogs
                    .Where(l => l.Timestamp >= DateTime.UtcNow.AddMonths(-6) || l.CreatedAt >= DateTime.UtcNow.AddMonths(-6))
                    .Select(l => new { l.ActivityType, l.Timestamp, l.CreatedAt })
                    .ToListAsync();

                // ✅ แก้ไข: ดึงข้อมูลฝั่ง Memory แล้ว ToUpper() ก่อนเช็ค เพื่อให้ครอบคลุมทุกคำโดยไม่สนพิมพ์เล็ก/ใหญ่
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

                // --- E. Yearly Data ---
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