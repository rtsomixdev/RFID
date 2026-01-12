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

        // GET: api/Report?type=damaged&startDate=...&endDate=...
        [HttpGet]
        public async Task<IActionResult> GetReport(string type, DateTime? startDate, DateTime? endDate)
        {
            // ถ้าไม่เลือกวันที่ ให้ Default เป็นช่วงกว้างๆ
            var start = startDate ?? DateTime.MinValue;
            var end = endDate ?? DateTime.MaxValue;

            if (type == "damaged") // 1. รายงานผ้าชำรุด/สูญหาย
            {
                var data = await _context.Linens
                    .Include(l => l.Product)
                    .Where(l => l.IsActive == false && l.Status != "Available" && l.UpdatedAt >= start && l.UpdatedAt <= end)
                    .OrderByDescending(l => l.UpdatedAt)
                    .Select(l => new {
                        Date = l.UpdatedAt.HasValue ? l.UpdatedAt.Value.ToString("yyyy-MM-dd HH:mm") : "-",
                        Product = l.Product.ProductName ?? "Unknown",
                        RFID = l.RfidCode,
                        Status = l.Status
                    })
                    .ToListAsync();
                
                return Ok(data);
            }
            else if (type == "movement") // 2. รายงานการเคลื่อนไหว (Movement)
            {
                // ตัวอย่าง: ดึงจาก SystemLogs หรือ LinenLogs
                var data = await _context.SystemLogs
                    .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new {
                        Date = x.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                        Product = x.ActionType, // ใช้ช่อง Product แทน ActionType ชั่วคราว
                        RFID = x.Description,
                        Status = "Log"
                    })
                    .ToListAsync();

                return Ok(data);
            }

            return Ok(new List<object>()); // ถ้าไม่ตรงเงื่อนไข ส่งอาเรย์ว่างกลับไป (ไม่ Error)
        }
    }
}