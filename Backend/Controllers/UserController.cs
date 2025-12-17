using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly LinenDbContext _context;

    public UserController(LinenDbContext context)
    {
        _context = context;
    }

    // GET: api/User
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return await _context.Users.ToListAsync();
    }

    // GET: api/User/5
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();
        return user;
    }

    // ✅ PUT: api/User/5 (Update)
    [HttpPut("{id}")]
    public async Task<IActionResult> PutUser(int id, User user)
    {
        // 1. ตรวจสอบ ID
        if (id != user.UserId)
        {
            return BadRequest(new { message = "User ID mismatch" });
        }

        // 2. ดึงข้อมูลเดิมจาก DB (AsNoTracking เพื่อไม่ให้ชน)
        var existingUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == id);
        
        if (existingUser == null)
        {
            return NotFound(new { message = "User not found" });
        }

        // 3. Logic รหัสผ่าน: ถ้าไม่ส่งมา หรือส่งมาว่าง ให้ใช้รหัสเดิม
        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            user.PasswordHash = existingUser.PasswordHash;
        }

        // 4. รักษาค่าอื่นๆ ที่อาจจะไม่ได้ส่งมา (ป้องกันค่าหาย)
        if (user.CreatedAt == null) user.CreatedAt = existingUser.CreatedAt;
        if (user.OtpCode == null) user.OtpCode = existingUser.OtpCode;
        if (user.OtpExpiry == null) user.OtpExpiry = existingUser.OtpExpiry;
        
        // ป้องกัน Error 500 เรื่อง Foreign Key
        if (user.HospitalId == null || user.HospitalId == 0) user.HospitalId = 1;
        if (user.WardId == null || user.WardId == 0) user.WardId = 1;

        // 5. สั่งอัปเดต
        _context.Entry(user).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!UserExists(id)) return NotFound();
            else throw;
        }
        catch (Exception ex)
        {
            // ส่ง Error จริงกลับไปให้ Frontend เห็น (จะได้แก้ถูกจุด)
            return StatusCode(500, new { message = "Database Error: " + ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : "") });
        }

        return NoContent();
    }

    // POST: api/User
    [HttpPost]
    public async Task<ActionResult<User>> PostUser(User user)
    {
        user.CreatedAt = DateTime.UtcNow;
        
        // ป้องกัน Error 500 เรื่อง Foreign Key ตอนสร้างใหม่
        if (user.HospitalId == null || user.HospitalId == 0) user.HospitalId = 1;
        if (user.WardId == null || user.WardId == 0) user.WardId = 1;

        _context.Users.Add(user);
        try 
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
             return StatusCode(500, new { message = "Database Error: " + ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : "") });
        }
        
        return CreatedAtAction("GetUser", new { id = user.UserId }, user);
    }

    // DELETE: api/User/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool UserExists(int id)
    {
        return _context.Users.Any(e => e.UserId == id);
    }
}