using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Globalization;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly LinenDbContext _context;

    public DashboardController(LinenDbContext context)
    {
        _context = context;
    }

    // 1. API เดิม (เอาไว้โชว์ตัวเลข Card ด้านบน)
    [HttpGet("Stats")]
    public async Task<IActionResult> GetStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalLinens = await _context.Linens.CountAsync();
        var pendingRequests = await _context.Requests.Where(r => r.CurrentStatusId == 1).CountAsync();
        var approvedToday = await _context.Requests.Where(r => r.CurrentStatusId == 2 && r.UpdatedAt >= today).CountAsync();
        var damagedItems = await _context.RequestItems.Where(ri => ri.DamageReasonId != null).CountAsync();

        return Ok(new { TotalLinens = totalLinens, PendingRequests = pendingRequests, ApprovedToday = approvedToday, DamagedItems = damagedItems });
    }

    // 2. API ใหม่ (สำหรับกราฟ) **ต้องมีอันนี้ครับ**
    [HttpGet("ChartData")]
    public async Task<IActionResult> GetChartData()
    {
        var today = DateTime.UtcNow.Date;
        
        // Pie Chart
        var pieData = await _context.Linens
            .Include(l => l.Product).ThenInclude(p => p.Category)
            .GroupBy(l => l.Product.Category.CategoryName)
            .Select(g => new { name = g.Key, value = g.Count() })
            .ToListAsync();

        // Daily Data (ย้อนหลัง 7 วัน)
        var sevenDaysAgo = today.AddDays(-6);
        var logs = await _context.LinenLogs.Where(l => l.Timestamp >= sevenDaysAgo).ToListAsync();
        var dailyData = Enumerable.Range(0, 7).Select(i => {
            var date = sevenDaysAgo.AddDays(i);
            var dayLogs = logs.Where(l => l.Timestamp.HasValue && l.Timestamp.Value.Date == date).ToList();
            return new {
                name = date.ToString("ddd", new CultureInfo("en-US")),
                use = dayLogs.Count(l => l.ActivityType == "ISSUE"),
                wash = dayLogs.Count(l => l.ActivityType == "RETURN"),
                damage = dayLogs.Count(l => l.ActivityType == "DAMAGE")
            };
        }).ToList();

        // Monthly Data (ย้อนหลัง 6 เดือน)
        var sixMonthsAgo = today.AddMonths(-5);
        var requests = await _context.Requests.Where(r => r.CreatedAt >= sixMonthsAgo).ToListAsync();
        var damageItems = await _context.RequestItems.Where(ri => ri.DamageReasonId != null).ToListAsync();

        var monthsData = Enumerable.Range(0, 6).Select(i => {
            var d = sixMonthsAgo.AddMonths(i);
            var monthName = d.ToString("MMM", new CultureInfo("en-US"));
            var reqCount = requests.Count(r => r.CreatedAt.HasValue && r.CreatedAt.Value.Month == d.Month && r.CreatedAt.Value.Year == d.Year);
            var dmgCount = damageItems.Count; // แบบง่าย (นับรวมทั้งหมดไปก่อน)
            
            return new { name = monthName, reqCount, dmgCount, active = d.Month == today.Month };
        }).ToList();

        return Ok(new {
            pieData,
            dailyData,
            requestData = monthsData.Select(m => new { m.name, count = m.reqCount, m.active }),
            damagedData = monthsData.Select(m => new { m.name, count = m.dmgCount, m.active }),
            quarterlyData = dailyData // ใช้ Daily แก้ขัดไปก่อน
        });
    }
}