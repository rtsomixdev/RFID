using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลสำหรับการบันทึกการส่งซักและรับคืนผ้า
    /// </summary>
    public class LaundryRequestDto
    {
        public int VendorId { get; set; }
        public List<string> RfidCodes { get; set; } = new List<string>();
    }

    /// <summary>
    /// ควบคุมกระบวนการส่งซัก รับคืน และตรวจสอบสถานะผ้าที่เกี่ยวข้องกับผู้ให้บริการซักรีด
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class LaundryController : ControllerBase
    {
        private readonly Services.ILaundryService _service; 

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ LaundryController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการกระบวนการซักรีด</param>
        public LaundryController(Services.ILaundryService service)
        {
            _service = service;
        }

        /// <summary>
        /// ตรวจสอบสถานะการซักของผ้าด้วยรหัสผ่าน RFID
        /// </summary>
        /// <param name="rfid">รหัส RFID ของผ้า</param>
        /// <returns>ข้อมูลสถานะการซักของผ้า</returns>
        [HttpGet("Check/{rfid}")]
        public async Task<ActionResult<object>> CheckLinen(string rfid)
        {
            var result = await _service.CheckLinenAsync(rfid);
            if (result.Status == 404) return NotFound(new { message = result.Message });
            return Ok(result.Data);
        }

        /// <summary>
        /// ส่งผ้าไปยังผู้ให้บริการซักรีด
        /// </summary>
        /// <param name="request">ข้อมูลผู้ให้บริการและรายการรหัส RFID ของผ้า</param>
        /// <returns>ผลลัพธ์การบันทึกข้อมูลการส่งซัก</returns>
        [HttpPost("Send")]
        public async Task<IActionResult> SendToWash([FromBody] LaundryRequestDto request)
        {
            var result = await _service.SendToWashAsync(request);
            if (result.Status == 400) 
            {
                if (result.Message != null && result.Message.Contains("ส่งซักไม่ได้")) 
                    return BadRequest(new { message = result.Message });
                return BadRequest(result.Message);
            }
            if (result.Status == 404) return NotFound(result.Message);

            return Ok(new { message = result.Message, count = result.Count });
        }

        /// <summary>
        /// รับผ้าคืนจากผู้ให้บริการซักรีด
        /// </summary>
        /// <param name="request">ข้อมูลผู้ให้บริการและรายการรหัส RFID ของผ้าอัปเดตเป็นสถานะพร้อมใช้งาน</param>
        /// <returns>ผลลัพธ์การรับผ้าเข้าสู่ระบบ</returns>
        [HttpPost("Receive")]
        public async Task<IActionResult> ReceiveClean([FromBody] LaundryRequestDto request)
        {
            var result = await _service.ReceiveCleanAsync(request);
            if (result.Status == 400) 
            {
                if (result.Message != null && result.Message.Contains("รับคืนไม่ได้"))
                    return BadRequest(new { message = result.Message });
                return BadRequest(result.Message);
            }
            if (result.Status == 404) return NotFound(result.Message);

            return Ok(new { message = result.Message, count = result.Count });
        }

        /// <summary>
        /// ดึงรายการผู้ให้บริการที่สามารถเลือกได้ตามประเภทรายการ (ส่งซัก หรือ รับคืน)
        /// </summary>
        /// <param name="mode">ประเภทรายการ เช่น send หรือ receive</param>
        /// <returns>รายการผู้ให้บริการ</returns>
        [HttpGet("Candidates/{mode}")]
        public async Task<ActionResult<IEnumerable<object>>> GetCandidates(string mode)
        {
            var result = await _service.GetCandidatesAsync(mode);
            if (result.Status == 400) return BadRequest("Invalid mode");
            return Ok(result.Data);
        }

        /// <summary>
        /// ดึงประวัติการทำรายการส่งซักและรับคืนล่าสุด
        /// </summary>
        /// <returns>รายการประวัติการซักผ้า</returns>
        [HttpGet("History")]
        public async Task<ActionResult<IEnumerable<object>>> GetWashingList()
        {
            return Ok(await _service.GetWashingListAsync());
        }
        
        /// <summary>
        /// ยกเลิกรายการส่งซักหากเกิดข้อผิดพลาดในการทำรายการ
        /// </summary>
        /// <param name="rfidCodes">รายการรหัส RFID ที่ต้องการยกเลิกการส่งซัก</param>
        /// <returns>ผลลัพธ์การยกเลิก</returns>
        [HttpPost("Cancel")]
        public async Task<IActionResult> CancelLaundry([FromBody] List<string> rfidCodes)
        {
            var result = await _service.CancelLaundryAsync(rfidCodes);
            if (result.Status == 404) return NotFound(result.Message);
            return Ok(new { message = result.Message });
        }
    }
}