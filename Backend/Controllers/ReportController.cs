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
        // 1. รายงานความเคลื่อนไหว (Movement Report) - แบบ Grouping A->B
        // URL: GET /api/Report/Movement?start=...&end=...&type=...
        // ==========================================
        [HttpGet("Movement")]
        public async Task<IActionResult> GetMovementReport(DateTime? start, DateTime? end, string? type)
        {
            var startDate = start ?? DateTime.Today.AddDays(-30);
            var endDate = end?.AddDays(1) ?? DateTime.Today.AddDays(1);

            try
            {
                // 1. ดึง Raw Data จาก LinenLogs
                var query = _context.LinenLogs
                    .Include(l => l.Linen)
                        .ThenInclude(p => p.Product)
                    .Where(x => x.CreatedAt >= startDate && x.CreatedAt < endDate); // ใช้ CreatedAt ตาม Migration ใหม่

                // Filter by Type (ถ้ามีการส่ง parameter มา และไม่ใช่ All)
                if (!string.IsNullOrEmpty(type) && type != "All")
                {
                    query = query.Where(x => x.ActivityType == type);
                }

                var rawLogs = await query.ToListAsync();

                // 2. Grouping ใน Memory (เพื่อสรุปยอด)
                var groupedLogs = rawLogs
                    .GroupBy(x => new 
                    { 
                        // Group ตามเวลา (ระดับนาที), ประเภท, สินค้า, และเส้นทาง (Flow)
                        TimeGroup = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"), 
                        Activity = x.ActivityType, 
                        ProductName = x.Linen?.Product?.ProductName ?? "Unknown",
                        From = x.FromLocation ?? "-",
                        To = x.ToLocation ?? "-"
                    })
                    .Select((g, index) => new
                    {
                        id = index + 1,
                        date = g.Key.TimeGroup,
                        type = g.Key.Activity, // Add, Wash, Move, Discard, Restock
                        productName = g.Key.ProductName,
                        
                        // ✅ สร้าง Flow String (A -> B)
                        flow = $"{g.Key.From} ➝ {g.Key.To}",
                        
                        // ✅ นับจำนวน (Quantity) พร้อมเครื่องหมาย
                        qty = IsOutgoing(g.Key.Activity) ? -g.Count() : g.Count(),
                        
                        user = "Auto System" // หรือดึงจาก User ID ถ้ามีการเก็บ
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

        // Helper Function เช็คว่าเป็นขาออกหรือไม่ (เพื่อใส่เครื่องหมายลบ)
        private bool IsOutgoing(string? activity)
        {
            if (string.IsNullOrEmpty(activity)) return false;
            // รายการเหล่านี้ถือเป็นการตัดยอดออก หรือย้ายออก
            var outgoingTypes = new[] { "Wash", "Discard", "Request", "Move_Out", "SendingToWash" };
            return outgoingTypes.Contains(activity, StringComparer.OrdinalIgnoreCase);
        }

        // ==========================================
        // 2. รายงานผ้าชำรุด/สูญหาย (Damaged Report) - รายชิ้น
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
                        Status = l.Status, // สาเหตุการชำรุด
                        Location = l.CurrentLocation // เพิ่มตำแหน่งล่าสุดที่เจอ
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