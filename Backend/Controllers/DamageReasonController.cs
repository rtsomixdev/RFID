using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการจัดการข้อมูลสาเหตุความเสียหาย (Damage Reason)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class DamageReasonController : ControllerBase
    {
        private readonly IDamageReasonService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ DamageReasonController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการสาเหตุความเสียหาย</param>
        public DamageReasonController(IDamageReasonService service) => _service = service;

        /// <summary>
        /// ดึงข้อมูลสาเหตุความเสียหายทั้งหมด
        /// </summary>
        /// <returns>รายการสาเหตุความเสียหายทั้งหมด</returns>
        [HttpGet] 
        public async Task<ActionResult<IEnumerable<DamageReason>>> Get() 
            => Ok(await _service.GetAsync());

        /// <summary>
        /// ดึงข้อมูลสาเหตุความเสียหายตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสสาเหตุความเสียหาย</param>
        /// <returns>ข้อมูลสาเหตุความเสียหายที่พบ</returns>
        [HttpGet("{id}")] 
        public async Task<ActionResult<DamageReason>> Get(int id) 
        { 
            var item = await _service.GetAsync(id); 
            return item == null ? NotFound() : Ok(item); 
        }

        /// <summary>
        /// สร้างข้อมูลสาเหตุความเสียหายใหม่
        /// </summary>
        /// <param name="item">ข้อมูลสาเหตุความเสียหายที่ต้องการสร้าง</param>
        /// <returns>ข้อมูลสาเหตุความเสียหายที่ถูกสร้างเรียบร้อยแล้ว</returns>
        [HttpPost] 
        public async Task<ActionResult<DamageReason>> Post(DamageReason item) 
        { 
            var createdItem = await _service.PostAsync(item);
            return CreatedAtAction(nameof(Get), new { id = createdItem.ReasonId }, createdItem); 
        }

        /// <summary>
        /// อัปเดตข้อมูลสาเหตุความเสียหายตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสสาเหตุความเสียหายที่ต้องการอัปเดต</param>
        /// <param name="item">ข้อมูลสาเหตุความเสียหายใหม่</param>
        /// <returns>ผลลัพธ์การอัปเดตข้อมูล</returns>
        [HttpPut("{id}")] 
        public async Task<IActionResult> Put(int id, DamageReason item) 
        { 
            var success = await _service.PutAsync(id, item);
            if (!success) return BadRequest();
            return NoContent(); 
        }

        /// <summary>
        /// ลบข้อมูลสาเหตุความเสียหายตามรหัสที่ระบุ
        /// </summary>
        /// <param name="id">รหัสสาเหตุความเสียหายที่ต้องการลบ</param>
        /// <returns>ผลลัพธ์การลบข้อมูล</returns>
        [HttpDelete("{id}")] 
        public async Task<IActionResult> Delete(int id) 
        { 
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent(); 
        }
    }
}