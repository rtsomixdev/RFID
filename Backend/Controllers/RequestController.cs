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
    /// ข้อมูลชุดสำหรับการปรับปรุงสถานะการติดตามการจัดส่งของคำร้อง
    /// </summary>
    public class UpdateRequestTrackingDto
    {
        public int NewStatusId { get; set; } 
        public string? TrackingNote { get; set; } 
    }

    /// <summary>
    /// ควบคุมกระบวนการใบคำร้องในระบบ เช่น สร้าง อนุมัติ ติดตามพัสดุ และยกเลิกใบคำร้อง
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class RequestController : ControllerBase
    {
        private readonly Services.IRequestService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ RequestController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการและใช้งานคำร้อง</param>
        public RequestController(Services.IRequestService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงข้อมูลใบคำร้องทั้งหมดในระบบ
        /// </summary>
        /// <returns>ชุดรายการคำร้องของระบบ</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Request>>> GetRequests()
        {
            return Ok(await _service.GetRequestsAsync());
        }

        /// <summary>
        /// ค้นหาใบคำร้องด้วยรหัสไอดี
        /// </summary>
        /// <param name="id">รหัสประจำใบคำร้อง</param>
        /// <returns>รายละเอียดที่เจาะจงของคำร้องนั้นๆ</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<Request>> GetRequest(int id)
        {
            var request = await _service.GetRequestAsync(id);

            if (request == null) return NotFound();

            return Ok(request);
        }

        /// <summary>
        /// ดึงจำนวนสต็อกที่มีอยู่ของสินค้าตามรหัสที่ต้องการเพื่อนำมาใช้ในใบคำร้อง
        /// </summary>
        /// <param name="productId">หมายเลขของสินค้าที่ต้องการตรวจสอบ</param>
        /// <returns>จำนวนสินค้าที่มีในคลังของระบบ</returns>
        [HttpGet("CheckStock/{productId}")]
        public async Task<IActionResult> GetStock(int productId)
        {
            var result = await _service.CheckStockAsync(productId);
            return Ok(result);
        }

        /// <summary>
        /// สร้างใบคำร้องใหม่ส่งเข้าระบบ
        /// </summary>
        /// <param name="request">รายละเอียดความต้องการในคำร้อง</param>
        /// <returns>ใบคำร้องที่สร้างสำเร็จและเชื่อมเข้าสู่ขั้นตอนถัดไป</returns>
        [HttpPost]
        public async Task<ActionResult<Request>> PostRequest(Request request)
        {
            var result = await _service.PostRequestAsync(request);

            if (result.Status == 400) return BadRequest(new { message = result.Message });
            if (result.Status == 500) return StatusCode(500, new { message = result.Message });

            return CreatedAtAction("GetRequest", new { id = result.Item?.RequestId }, result.Item);
        }

        /// <summary>
        /// อนุมัติหรือปรับปรุงสถานะข้อมูลโดยรวมของคำร้อง
        /// </summary>
        /// <param name="id">รหัสใบคำร้อง</param>
        /// <param name="request">ข้อมูลส่วนที่ได้รับการเปลี่ยนแปลงของใบคำร้อง</param>
        /// <returns>สถานะสะท้อนผลการแก้ไข</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRequest(int id, Request request)
        {
            var result = await _service.PutRequestAsync(id, request);
            
            if (result.Status == 400) return BadRequest(result.Message);
            if (result.Status == 404) return NotFound();

            return NoContent();
        }

        /// <summary>
        /// ปรับปรุงสถานะการติดตามการจัดส่งแบบเฉพาะเจาะจงสำหรับใบคำร้องใบใดใบหนึ่ง
        /// </summary>
        /// <param name="id">รหัสใบคำร้องต้นทาง</param>
        /// <param name="dto">ข้อมูลอัปเดตสถานะและบันทึกเพิ่มเติม</param>
        /// <returns>ผลสัมฤทธิ์ที่ระบุสถานะล่าสุดที่ทำการแก้ไขแล้ว</returns>
        [HttpPut("{id}/update-tracking")]
        public async Task<IActionResult> UpdateTracking(int id, [FromBody] UpdateRequestTrackingDto dto)
        {
            var result = await _service.UpdateTrackingAsync(id, dto);

            if (result.Status == 404) return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// ยกเลิกรายการใบคำร้องออกจากระบบ (โดยหลีกเลี่ยงการลบจริงเพื่อคงประวัติไว้)
        /// </summary>
        /// <param name="id">รหัสใบคำร้องที่ต้องการยกเลิก</param>
        /// <returns>คำยืนยันระดับกระบวนการในการยกเลิก</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelRequest(int id)
        {
            var result = await _service.CancelRequestAsync(id);

            if (result.Status == 404) return NotFound();

            return Ok(new { message = result.Message });
        }
    }
}