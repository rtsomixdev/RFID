using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public SettingController(LinenDbContext context)
        {
            _context = context;
        }

        // GET: api/Setting
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Setting>>> GetSettings()
        {
            return await _context.Settings.ToListAsync();
        }

        // PUT: api/Setting/Update
        [HttpPut("Update")]
        public async Task<IActionResult> UpdateSetting([FromBody] Setting setting)
        {
            var existing = await _context.Settings.FindAsync(setting.Id);
            if (existing == null) return NotFound("ไม่พบการตั้งค่านี้");

            existing.Value = setting.Value;
            existing.Description = setting.Description; // อัปเดตคำอธิบายได้ด้วย

            await _context.SaveChangesAsync();
            return Ok(new { message = "บันทึกการตั้งค่าเรียบร้อย" });
        }
        
        // POST: สร้างค่าใหม่ (เผื่อใช้)
        [HttpPost]
        public async Task<ActionResult<Setting>> CreateSetting(Setting setting)
        {
            _context.Settings.Add(setting);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSettings), new { id = setting.Id }, setting);
        }
    }
}