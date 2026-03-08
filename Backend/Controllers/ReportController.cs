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
    /// ควบคุมการจัดทำรายงานและการสืบค้นข้อมูลเชิงสถิติของระบบ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ReportController : ControllerBase
    {
        private readonly Services.IReportService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ ReportController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการรายงานข้อมูลสรุปต่างๆ</param>
        public ReportController(Services.IReportService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงรายงานข้อมูลความเคลื่อนไหว โดยรองรับการกรองตามช่วงเวลาและประเภท
        /// </summary>
        /// <param name="start">วันเริ่มต้นของรายงาน</param>
        /// <param name="end">วันสิ้นสุดของรายงาน</param>
        /// <param name="type">ประเภทความเคลื่อนไหวที่ต้องการดูเป็นพิเศษ (เลือกได้)</param>
        /// <returns>ข้อมูลรายงานสรุปความเคลื่อนไหวตามที่มีการจับคู่เชื่อมโยง (Grouping)</returns>
        [HttpGet("Movement")]
        public async Task<IActionResult> GetMovementReport(DateTime? start, DateTime? end, string? type)
        {
            var result = await _service.GetMovementReportAsync(start, end, type);
            if (result.Status == 500) return StatusCode(500, new { message = "Error generating movement report", error = result.Message });

            return Ok(result.Data);
        }

        /// <summary>
        /// ดึงข้อมูลสำหรับรายงานผลิตภัณฑ์หรือผ้าที่ตรวจพบว่าชำรุดเสียหาย และสูญหาย
        /// </summary>
        /// <param name="start">วันเริ่มต้นของรายงาน</param>
        /// <param name="end">วันสิ้นสุดของรายงาน</param>
        /// <returns>รายการสรุปจำนวนและรายละเอียดของผ้าที่เสียหาย</returns>
        [HttpGet("Damaged")]
        public async Task<IActionResult> GetDamagedReport(DateTime? start, DateTime? end)
        {
            var result = await _service.GetDamagedReportAsync(start, end);
            if (result.Status == 500) return StatusCode(500, new { message = "Error generating damaged report", error = result.Message });

            return Ok(result.Data);
        }
    }
}