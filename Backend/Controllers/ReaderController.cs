using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Threading.Tasks;
using System.Linq; // 👈 ต้องมีบรรทัดนี้ ไม่งั้น .Select() จะแดง

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReaderController : ControllerBase
    {
        private readonly LinenDbContext _context;

        public ReaderController(LinenDbContext context)
        {
            _context = context;
        }

        // GET: api/Reader
        [HttpGet]
        public async Task<IActionResult> GetReaders()
        {
            // ✅ แก้ไข: เลือกส่งเฉพาะ Id, Name, Location (ตัด TimeOnly ทิ้ง)
            var readers = await _context.Readers
                .Where(r => r.IsActive == true)
                .OrderBy(r => r.ReaderName)
                .Select(r => new 
                {
                    r.ReaderId,
                    r.ReaderName,
                    Location = r.Location ?? "-" // กันค่าว่าง
                })
                .ToListAsync();

            return Ok(readers);
        }

        // GET: api/Reader/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReader(int id)
        {
            var reader = await _context.Readers
                .Where(r => r.ReaderId == id)
                .Select(r => new 
                {
                    r.ReaderId,
                    r.ReaderName,
                    Location = r.Location ?? "-"
                })
                .FirstOrDefaultAsync();

            if (reader == null) return NotFound();
            return Ok(reader);
        }
    }
}