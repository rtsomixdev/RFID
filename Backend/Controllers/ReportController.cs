using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public ReportController(LinenDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. รายงานความเคลื่อนไหว (Movement Report)
        // ใช้ในหน้า Reports.tsx
        // URL: GET /api/Report/Movement?start=...&end=...
        // ==========================================
        [HttpGet("Movement")]
        public async Task<IActionResult> GetMovementReport(DateTime? start, DateTime? end)
        {
            var startDate = start ?? DateTime.Today.AddDays(-30);
            var endDate = end?.AddDays(1) ?? DateTime.Today.AddDays(1); // บวก 1 วันเพื่อให้ครอบคลุมถึงจบวัน

            try
            {
                // ดึงข้อมูลจาก LinenLogs
                // ต้องแน่ใจว่าใน LinenDbContext มี public DbSet<LinenLog> LinenLogs { get; set; }
                var query = _context.LinenLogs
                    .Include(l => l.Linen)
                        .ThenInclude(p => p.Product)
                    .Where(x => x.Timestamp >= startDate && x.Timestamp < endDate);

                // ดึงข้อมูลมา Group ใน Memory (เพื่อให้จัด Format วันที่ได้ง่าย)
                var rawLogs = await query.ToListAsync();

                var groupedLogs = rawLogs
                    .GroupBy(x => new 
                    { 
                        // Group ตามเวลา (ระดับนาที), ประเภท, และชื่อสินค้า
                        TimeGroup = x.Timestamp.Value.ToString("yyyy-MM-dd HH:mm"), 
                        Activity = x.ActivityType, 
                        ProductName = x.Linen?.Product?.ProductName ?? "Unknown" 
                    })
                    .Select((g, index) => new
                    {
                        id = index + 1,
                        date = g.Key.TimeGroup, // ส่งเป็น String ให้ Frontend
                        type = g.Key.Activity,
                        productName = g.Key.ProductName,
                        // คำนวณยอด: ถ้าเป็น Add/Restock เป็นบวก, ถ้า Wash/Discard เป็นลบ
                        qty = (g.Key.Activity == "Add" || g.Key.Activity == "Restock") ? g.Count() : -g.Count(),
                        balance = 0, // Frontend ไม่ได้ใช้ยอดคงเหลือสะสมในตารางนี้ ใส่ 0 ไว้ก่อน
                        user = "System" // หรือดึงจาก User ID ถ้ามี
                    })
                    .OrderByDescending(x => x.date)
                    .ToList();

                return Ok(groupedLogs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating movement report", error = ex.Message });
            }
        }

        // ==========================================
        // 2. รายงานผ้าชำรุด/สูญหาย (Damaged Report)
        // URL: GET /api/Report/Damaged?start=...&end=...
        // ==========================================
        [HttpGet("Damaged")]
        public async Task<IActionResult> GetDamagedReport(DateTime? start, DateTime? end)
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
                        Status = l.Status // สาเหตุการชำรุด (เช่น Damaged, Lost)
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating damaged report", error = ex.Message });
            }
        }
    }
}