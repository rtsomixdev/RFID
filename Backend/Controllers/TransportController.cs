using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลอ้างอิงและพารามิเตอร์สำหรับการสแกนจุดอ่านที่เกี่ยวกับการเคลื่อนย้ายขนส่ง
    /// </summary>
    public class TransportDto
    {
        public List<string> RfidCodes { get; set; } = new List<string>();
        public int ReaderId { get; set; } 
        public int? RequestId { get; set; } 
    }

    /// <summary>
    /// ควบคุมกิจกรรมการสแกนนำเข้า-นำออกและการกระจายสินค้าที่จุดเคลื่อนย้าย
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class TransportController : ControllerBase
    {
        private readonly Services.ITransportService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ TransportController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการการขนย้าย</param>
        public TransportController(Services.ITransportService service)
        {
            _service = service;
        }

        /// <summary>
        /// จัดการสแกนเพื่อส่งผ้าออกหรือตัดสต็อกเคลื่อนย้าย
        /// </summary>
        /// <param name="input">ข้อมูลการสแกนนำออก</param>
        /// <returns>สถานะผลลัพธ์การกระทำ</returns>
        [HttpPost("Dispatch")]
        public async Task<IActionResult> Dispatch([FromBody] TransportDto input)
        {
            var result = await _service.DispatchAsync(input);

            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound(result.Message);

            return Ok(new { message = result.Message, status = result.ResultStatus });
        }

        /// <summary>
        /// รับผ้าเข้ามาสู่ระบบตามส่วนงานที่รับมอบ
        /// </summary>
        /// <param name="input">ข้อมูลการสแกนรับเข้า</param>
        /// <returns>สถานะผลลัพธ์และตำแหน่งที่ได้รับแจ้ง</returns>
        [HttpPost("Receive")]
        public async Task<IActionResult> Receive([FromBody] TransportDto input)
        {
            var result = await _service.ReceiveAsync(input);

            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound(result.Message);

            return Ok(new { message = result.Message, location = result.Location });
        }
    }
}