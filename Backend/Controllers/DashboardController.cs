using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using System.Globalization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมการดึงข้อมูลสรุปสำหรับแผงควบคุม (Dashboard)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly Services.IDashboardService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ DashboardController
        /// </summary>
        /// <param name="service">บริการสำหรับการดึงข้อมูลสรุป</param>
        public DashboardController(Services.IDashboardService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงข้อมูลสถิติภาพรวมเพื่อแสดงผลในส่วนบนของแผงควบคุม
        /// </summary>
        /// <returns>ข้อมูลตัวเลขสถิติที่สำคัญ</returns>
        [HttpGet("Stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var stats = await _service.GetStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Stats Error: " + ex.Message });
            }
        }

        /// <summary>
        /// ดึงข้อมูลสำหรับสร้างกราฟเพื่อแสดงแนวโน้มหรือสัดส่วนต่างๆ
        /// </summary>
        /// <returns>ชุดข้อมูลเชิงสถิติสำหรับสร้างกราฟ</returns>
        [HttpGet("ChartData")]
        public async Task<IActionResult> GetChartData()
        {
            try
            {
                var data = await _service.GetChartDataAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Chart Data Error: " + ex.Message });
            }
        }
    }
}