using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Services;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.SignalR;
using Backend.Hubs;
using System.Text.Json; 

namespace Backend.Controllers
{
    /// <summary>
    /// ข้อมูลสำหรับการตั้งค่าอุปกรณ์เครื่องอ่าน (Reader Configuration)
    /// </summary>
    public class ReaderConfigDto 
    { 
        public string ReaderId { get; set; } = string.Empty;
        public string Command { get; set; } = string.Empty;
        public string? Value { get; set; } 
    }

    /// <summary>
    /// ควบคุมการทำงาน การจัดการตั้งค่า และสถานะของเครื่องอ่าน RFID
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ReaderController : ControllerBase
    {
        private readonly Services.IReaderService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ ReaderController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการเครื่องอ่าน</param>
        public ReaderController(Services.IReaderService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงข้อมูลเครื่องอ่านทั้งหมดที่อยู่ในระบบ
        /// </summary>
        /// <returns>รายการเครื่องอ่านทั้งหมด</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Reader>>> GetReaders()
        {
            return Ok(await _service.GetReadersAsync());
        }

        /// <summary>
        /// เพิ่มข้อมูลเครื่องอ่านใหม่เข้าสู่ระบบ
        /// </summary>
        /// <param name="reader">ข้อมูลการตั้งค่าเริ่มต้นของเครื่องอ่าน</param>
        /// <returns>ผลลัพธ์การเพิ่มข้อมูลและรายละเอียดเครื่องอ่าน</returns>
        [HttpPost]
        public async Task<IActionResult> AddReader([FromBody] Reader reader)
        {
            var result = await _service.AddReaderAsync(reader);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            
            return CreatedAtAction("GetReaders", new { id = result.Item?.ReaderId }, result.Item);
        }

        /// <summary>
        /// อัปเดตข้อมูลการตั้งค่าเครื่องอ่านตามรหัสที่กำหนด
        /// </summary>
        /// <param name="id">รหัสเครื่องอ่าน</param>
        /// <param name="reader">ข้อมูลใหม่สำหรับอัปเดต</param>
        /// <returns>สถานะความสำเร็จจากการอัปเดต</returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReader(int id, [FromBody] Reader reader)
        {
            var result = await _service.UpdateReaderAsync(id, reader);
            if (result.Status == 400) return BadRequest(new { message = result.Message });
            if (result.Status == 404) return NotFound();

            return NoContent();
        }

        /// <summary>
        /// ลบข้อมูลเครื่องอ่านออกจากระบบ
        /// </summary>
        /// <param name="id">รหัสเครื่องอ่านที่ต้องการลบ</param>
        /// <returns>สถานะแสดงผลลัพธ์การลบ</returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReader(int id)
        {
            var result = await _service.DeleteReaderAsync(id);
            if (result.Status == 404) return NotFound();

            return Ok();
        }

        /// <summary>
        /// จัดส่งคำสั่งและข้อมูลการตั้งค่าข้ามไปยังอุปกรณ์เครื่องอ่านแบบระยะไกล (Config Sync)
        /// </summary>
        /// <param name="request">ข้อมูลชุดคำสั่ง</param>
        /// <returns>ผลลัพธ์การส่งคำสั่งไปยังอุปกรณ์</returns>
        [HttpPost("Config")]
        public async Task<IActionResult> SendConfig([FromBody] ReaderConfigDto request)
        {
            var result = await _service.SendConfigAsync(request);
            if (result.Status == 404) return NotFound(new { message = result.Message });
            if (result.Status == 500) return StatusCode(500, new { message = result.Message });

            return Ok(new { message = result.Message });
        }

        /// <summary>
        /// กระตุ้นการทำงานของเครื่องอ่าน (Wake reader) เพื่อให้กลับมาทำงานหรือรายงานสถานะ
        /// </summary>
        /// <param name="readerName">ชื่ออ้างอิงของเครื่องอ่าน</param>
        /// <returns>ผลลัพธ์การเปิดการทำงาน</returns>
        [HttpPost("Wake/{readerName}")]
        public async Task<IActionResult> WakeReader(string readerName)
        {
            var result = await _service.WakeReaderAsync(readerName);
            if (result.Status == 404) return NotFound(new { message = result.Message });
            if (result.Status == 500) return StatusCode(500, new { message = result.Message });

            return Ok(new { message = result.Message });
        }
    }
}