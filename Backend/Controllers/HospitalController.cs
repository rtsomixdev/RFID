using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HospitalController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public HospitalController(LinenDbContext context) => _context = context;

        // GET: api/Hospital
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Hospital>>> Get() 
        {
            return await _context.Hospitals.ToListAsync();
        }

        // GET: api/Hospital/5
        [HttpGet("{id}")] 
        public async Task<ActionResult<Hospital>> Get(int id) 
        { 
            var item = await _context.Hospitals.FindAsync(id); 
            return item == null ? NotFound() : item; 
        }

        // POST: api/Hospital
        [HttpPost] 
        public async Task<ActionResult<Hospital>> Post(Hospital item) 
        { 
            // เติมวันที่สร้างอัตโนมัติ (ถ้ามี field นี้)
            // item.CreatedAt = DateTime.Now; 
            
            _context.Hospitals.Add(item); 
            await _context.SaveChangesAsync(); 
            return CreatedAtAction(nameof(Get), new { id = item.HospitalId }, item); 
        }

        // PUT: api/Hospital/5
        // ✅ แก้ไขใหม่: ดึงของเก่ามาอัปเดต (ปลอดภัยกว่า)
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, Hospital item) 
        { 
            if (id != item.HospitalId) return BadRequest("ID ไม่ตรงกัน"); 

            // 1. หาข้อมูลเก่า
            var existingHospital = await _context.Hospitals.FindAsync(id);
            if (existingHospital == null) return NotFound("ไม่พบข้อมูลโรงพยาบาล");

            // 2. อัปเดตเฉพาะค่าที่ส่งมา
            existingHospital.HospitalName = item.HospitalName;
            existingHospital.Address = item.Address;
            existingHospital.ContactInfo = item.ContactInfo;
            
            // 3. บันทึก
            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Hospitals.Any(e => e.HospitalId == id)) return NotFound();
                else throw;
            }

            return Ok(existingHospital); 
        }

        // DELETE: api/Hospital/5
        // ✅ แก้ไขใหม่: เช็ค Foreign Key ครบทุกตาราง
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            // 1. เช็คว่ามี Wards (วอร์ด/แผนก) ผูกอยู่ไหม?
            var hasWards = await _context.Wards.AnyAsync(w => w.HospitalId == id);
            if (hasWards) 
                return BadRequest(new { message = "ลบไม่ได้: มีวอร์ด/แผนก สังกัดโรงพยาบาลนี้อยู่" });

            // 2. เช็คว่ามี Users (บุคลากร) ผูกอยู่ไหม?
            var hasUsers = await _context.Users.AnyAsync(u => u.HospitalId == id);
            if (hasUsers) 
                return BadRequest(new { message = "ลบไม่ได้: มีบุคลากรสังกัดโรงพยาบาลนี้อยู่" });

            // 3. เช็คว่ามี Linens (ผ้า) ผูกอยู่ไหม?
            var hasLinens = await _context.Linens.AnyAsync(l => l.HospitalId == id);
            if (hasLinens) 
                return BadRequest(new { message = "ลบไม่ได้: มีรายการผ้าของโรงพยาบาลนี้อยู่ในระบบ" });

            // 4. ถ้าไม่มีใครใช้เลย ค่อยลบ
            var item = await _context.Hospitals.FindAsync(id); 
            if (item == null) return NotFound(); 

            _context.Hospitals.Remove(item); 
            await _context.SaveChangesAsync(); 
            
            return NoContent(); 
        }
    }
}