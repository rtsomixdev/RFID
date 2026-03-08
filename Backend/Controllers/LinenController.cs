using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลสำหรับการบันทึกการตัดจำหน่ายผ้า (รายการเดียว)
    /// </summary>
    public class DiscardPayload
    {
        public string? RfidCode { get; set; }
        public int? ProductId { get; set; }
        public int DamageReasonId { get; set; } 
        public string? ReasonType { get; set; } 
        public string? ReasonNote { get; set; } 
        public string? Note { get; set; } 
        public int ReportedByUserId { get; set; }
    }

    /// <summary>
    /// ข้อมูลสำหรับการบันทึกการตัดจำหน่ายผ้า (หลายรายการพร้อมกัน)
    /// </summary>
    public class DiscardBatchDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int DamageReasonId { get; set; }
        public string? ReasonType { get; set; }
        public string? Note { get; set; }
        public int ReportedByUserId { get; set; }
    }

    /// <summary>
    /// ข้อมูลสำหรับการลงทะเบียนผ้าใหม่เข้าสู่ระบบ
    /// </summary>
    public class RegisterBatchDto
    {
        public int ProductId { get; set; }
        public int HospitalId { get; set; }
        public int? VendorId { get; set; }
        public List<string> RfidCodes { get; set; } = new List<string>();
    }

    /// <summary>
    /// ข้อมูลสำหรับการรับค่าคำสั่งเพื่อสแกนและประมวลผลผ้าตามการกระทำที่ระบุ
    /// </summary>
    public class ScanRequestDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int? ReaderId { get; set; } 
        public string ActionType { get; set; } = "CHECK"; 
        
        public int? RequestId { get; set; } 
    }

    /// <summary>
    /// ข้อมูลสำหรับการปรับปรุงและเพิ่มหมายเหตุให้กับประวัติการทำงานของผ้า
    /// </summary>
    public class UpdateLogNoteDto
    {
        public string Note { get; set; } = null!;
    }

    /// <summary>
    /// ควบคุมการจัดการข้อมูลหลักของผ้า (Linens) และการทำรายการต่างๆ เช่น ลงทะเบียน สแกน ตัดจำหน่าย
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class LinenController : ControllerBase
    {
        private readonly ILinenService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ LinenController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการข้อมูลของผ้า</param>
        public LinenController(ILinenService service)
        {
            _service = service;
        }

        /// <summary>
        /// ประมวลผลการสแกนผ้าในกรณีต่างๆ เช่น เช็คสถานะ, คืนผ้า หรือทำรายการคำร้อง (ตรวจสอบจำนวนครั้งที่ใช้ก่อนหมดอายุ)
        /// </summary>
        /// <param name="request">ข้อมูลรหัส RFID, เครื่องอ่านที่ใช้งาน และการกระทำที่ต้องการ</param>
        /// <returns>ผลลัพธ์การสแกนและสถานะที่เปลี่ยนแปลง</returns>
        [HttpPost("Scan")]
        public async Task<IActionResult> ScanProcess([FromBody] ScanRequestDto request)
        {
            var result = await _service.ScanProcessAsync(request);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            return Ok(result.Data);
        }

        /// <summary>
        /// ดึงรายการข้อมูลผ้าทั้งหมดภายในระบบ
        /// </summary>
        /// <returns>รายการข้อมูลของผ้า</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Linen>>> GetLinens()
        {
            return Ok(await _service.GetLinensAsync());
        }

        /// <summary>
        /// ค้นหาข้อมูลผ้าโดยใช้รหัส RFID
        /// </summary>
        /// <param name="rfid">รหัส RFID ของผ้าที่ต้องการค้นหา</param>
        /// <returns>ข้อมูลของผ้าที่พบ</returns>
        [HttpGet("Search")]
        public async Task<IActionResult> SearchLinen([FromQuery] string rfid)
        {
            if (string.IsNullOrEmpty(rfid)) return BadRequest("ระบุ RFID");
            return Ok(await _service.SearchLinenAsync(rfid));
        }

        /// <summary>
        /// ดึงประวัติรายการผ้าที่ถูกนำไปตัดจำหน่าย
        /// </summary>
        /// <returns>รายการประวัติการตัดจำหน่ายผ้า</returns>
        [HttpGet("DiscardHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardHistory()
        {
            return Ok(await _service.GetDiscardHistoryAsync());
        }

        /// <summary>
        /// ดึงประวัติรายการผ้าที่ถูกลบออกจากระบบ
        /// </summary>
        /// <returns>รายการประวัติการลบผ้า</returns>
        [HttpGet("DeleteHistory")]
        public async Task<ActionResult<IEnumerable<object>>> GetDeleteHistory()
        {
            return Ok(await _service.GetDeleteHistoryAsync());
        }

        /// <summary>
        /// ดึงข้อมูลการอ่านล่าสุดสำหรับการสังเกตการณ์ที่เครื่องอ่าน
        /// </summary>
        /// <returns>ข้อมูลและรายการการอ่านล่าสุดของระบบ</returns>
        [HttpGet("Monitor/Latest")]
        public async Task<IActionResult> GetLatestMonitor()
        {
            var result = await _service.GetLatestMonitorAsync();
            if (result.Status == 500) return StatusCode(500, new { message = "Server Error", error = result.Message });
            return Ok(result.Data);
        }

        /// <summary>
        /// ทำการตัดจำหน่ายผ้าแบบรายชิ้น
        /// </summary>
        /// <param name="payload">ข้อมูลการตัดจำหน่ายผ้า</param>
        /// <returns>ผลลัพธ์การตัดจำหน่าย</returns>
        [HttpPost("Discard")]
        public async Task<IActionResult> DiscardLinen([FromBody] DiscardPayload payload)
        {
            var result = await _service.DiscardLinenAsync(payload);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            if (result.Status == 404) return NotFound(new { message = result.Message });
            if (result.Status == 500) return StatusCode(500, new { message = result.Message });
            return Ok(new { message = result.Message });
        }

        /// <summary>
        /// บันทึกการสร้างข้อมูลผ้าใหม่เข้าระบบ
        /// </summary>
        /// <param name="linen">ข้อมูลผ้าเบื้องต้น</param>
        /// <returns>ข้อมูลผ้าที่สร้างใหม่</returns>
        [HttpPost]
        public async Task<ActionResult<Linen>> PostLinen(Linen linen)
        {
            var result = await _service.PostLinenAsync(linen);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            return CreatedAtAction("GetLinens", new { id = result.Item?.LinenId }, result.Item);
        }

        /// <summary>
        /// ลงทะเบียนผ้าปริมาณมาก (เป็นชุด) เข้าสู่ระบบ
        /// </summary>
        /// <param name="request">ข้อมูลการลงทะเบียนจำนวนมาก</param>
        /// <returns>ผลลัพธ์การลงทะเบียนจำนวนรายการสำเร็จและผิดพลาด</returns>
        [HttpPost("RegisterBatch")]
        public async Task<IActionResult> RegisterBatch([FromBody] RegisterBatchDto request)
        {
            var result = await _service.RegisterBatchAsync(request);
            if (result.Status == 400) 
            {
                if (result.Data != null) return BadRequest(new { message = result.Message, duplicates = ((dynamic)result.Data).duplicates });
                return BadRequest(result.Message);
            }
            return Ok(new { message = result.Message, newCount = ((dynamic)result.Data).newCount, reuseCount = ((dynamic)result.Data).reuseCount });
        }
        
        /// <summary>
        /// ลบข้อมูลผ้าออกจากระบบตามหมายเลข ID
        /// </summary>
        /// <param name="id">รหัส ID ในฐานข้อมูลของผ้า</param>
        /// <returns>ผลลัพธ์กระบวนการลบ</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLinen(int id)
        {
            if (!await _service.DeleteLinenAsync(id)) return NotFound();
            return NoContent();
        }

        /// <summary>
        /// ตัดจำหน่ายผ้าพร้อมกันหลายรายการ
        /// </summary>
        /// <param name="request">ข้อมูลรายการผ้าที่ต้องการตัดจำหน่าย</param>
        /// <returns>ผลลัพธ์การตัดจำหน่าย</returns>
        [HttpPost("DiscardBatch")]
        public async Task<IActionResult> DiscardBatch([FromBody] DiscardBatchDto request)
        {
            var result = await _service.DiscardBatchAsync(request);
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound(result.Message);
            return Ok(new { message = result.Message });
        }

        /// <summary>
        /// ลบข้อมูลผ้าหลายรายการพร้อมกันจากรหัส RFID
        /// </summary>
        /// <param name="rfidCodes">รหัส RFID ของผ้าทั้งหมดที่ต้องการลบ</param>
        /// <returns>ผลลัพธ์การลบรายการผ้า</returns>
        [HttpPost("DeleteBatch")]
        public async Task<IActionResult> DeleteBatch([FromBody] List<string> rfidCodes)
        {
            var result = await _service.DeleteBatchAsync(rfidCodes);
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound(result.Message);
            return Ok(new { message = result.Message });
        }

        /// <summary>
        /// ดึงรายการผู้ให้บริการสำหรับการเลือกในส่วนของการตัดจำหน่ายผ้า
        /// </summary>
        /// <returns>รายการผู้ให้บริการสำหรับการตัดจำหน่าย</returns>
        [HttpGet("Candidates/Discard")]
        public async Task<ActionResult<IEnumerable<object>>> GetDiscardCandidates()
        {
            return Ok(await _service.GetDiscardCandidatesAsync());
        }

        /// <summary>
        /// คืนค่าสถิติจากระบบผ้าเพื่อใช้ในการแสดงผลหน้าแดชบอร์ด
        /// </summary>
        /// <returns>ข้อมูลสถิติของแผงควบคุม</returns>
        [HttpGet("Dashboard/Stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            return Ok(await _service.GetDashboardStatsAsync());
        }

        /// <summary>
        /// ดึงรายการแจ้งเตือนที่เกี่ยวข้องกับการทำงานของผ้า
        /// </summary>
        /// <returns>รายการแจ้งเตือน</returns>
        [HttpGet("Notifications")]
        public async Task<IActionResult> GetNotifications()
        {
            return Ok(await _service.GetNotificationsAsync());
        }

        /// <summary>
        /// เพิ่มหมายเหตุลงบนประวัติของผ้า เช่น การแจ้งเปื้อน ชำรุด และอื่นๆ
        /// </summary>
        /// <param name="logId">รหัสของการบันทึกประวัติ (LogId)</param>
        /// <param name="dto">ข้อมูลหมายเหตุใหม่</param>
        /// <returns>สถานะและคำอธิบายหลังจากการปรับเปลี่ยน</returns>
        [HttpPut("Log/{logId}/note")]
        public async Task<IActionResult> AddLogNote(int logId, [FromBody] UpdateLogNoteDto dto)
        {
            var result = await _service.AddLogNoteAsync(logId, dto);
            if (result.Status == 404) return NotFound(new { message = result.Message });
            return Ok(new { message = result.Message, description = result.Description });
        }
    }
}