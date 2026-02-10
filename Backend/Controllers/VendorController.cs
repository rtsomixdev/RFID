using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorController : ControllerBase
    {
        private readonly LinenDbContext _context;
        public VendorController(LinenDbContext context) => _context = context;

        // GET: api/Vendor
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<Vendor>>> Get() 
        {
            return await _context.Vendors.ToListAsync();
        }

        // GET: api/Vendor/5
        [HttpGet("{id}")] 
        public async Task<ActionResult<Vendor>> Get(int id) 
        { 
            var item = await _context.Vendors.FindAsync(id); 
            return item == null ? NotFound() : item; 
        }

        // POST: api/Vendor
        [HttpPost] 
        public async Task<ActionResult<Vendor>> Post(Vendor item) 
        { 
            try 
            {
                _context.Vendors.Add(item); 
                await _context.SaveChangesAsync(); 
                return CreatedAtAction(nameof(Get), new { id = item.VendorId }, item); 
            }
            catch (Exception ex)
            {
                return StatusCode(500, "เพิ่มข้อมูลไม่สำเร็จ: " + ex.Message);
            }
        }

        // PUT: api/Vendor/5
        // ✅ แก้ไขใหม่: ดึงของเก่ามาอัปเดตค่า (ปลอดภัยกว่า State = Modified)
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, Vendor item) 
        { 
            if (id != item.VendorId) return BadRequest("ID ไม่ตรงกัน"); 

            // 1. ค้นหาข้อมูลเก่าใน DB
            var existingVendor = await _context.Vendors.FindAsync(id);
            if (existingVendor == null) return NotFound("ไม่พบข้อมูลบริษัทนี้");

            // 2. อัปเดตเฉพาะค่าที่ส่งมา
            existingVendor.VendorName = item.VendorName;
            existingVendor.RegistrationNumber = item.RegistrationNumber;
            // (ถ้ามี field อื่นให้เพิ่มตรงนี้)

            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Vendors.Any(e => e.VendorId == id)) return NotFound();
                else throw;
            }

            return Ok(existingVendor); // ส่งค่าล่าสุดกลับไป
        }

        // DELETE: api/Vendor/5
        // ✅ แก้ไขใหม่: เช็ค Foreign Key ก่อนลบ (กัน Error 500)
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            // 1. เช็คว่าบริษัทนี้ถูกใช้งานในตาราง Linens (ผ้า) หรือไม่?
            // ถ้ามีผ้าที่ผูกกับบริษัทนี้อยู่ ห้ามลบ!
            var isUsedInLinens = await _context.Linens.AnyAsync(l => l.VendorId == id);
            
            if (isUsedInLinens)
            {
                // ส่ง Error 400 พร้อมข้อความแจ้งเตือนกลับไปที่ Frontend
                return BadRequest(new { message = "ไม่สามารถลบได้ เนื่องจากมีรายการผ้าที่ผูกกับบริษัทนี้อยู่ในระบบ" });
            }

            // 2. ถ้าไม่มีการใช้งาน ค่อยลบ
            var item = await _context.Vendors.FindAsync(id); 
            if (item == null) return NotFound(); 

            _context.Vendors.Remove(item); 
            await _context.SaveChangesAsync(); 
            
            return NoContent(); 
        }
    }
}