using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Controllers
{
    /// <summary>
    /// ควบคุมข้อมูลและการตั้งค่าภาพรวมของทั้งระบบ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class SettingController : ControllerBase
    {
        private readonly Services.ISettingService _service;

        /// <summary>
        /// กำหนดค่าเริ่มต้นให้กับ SettingController
        /// </summary>
        /// <param name="service">บริการสำหรับการจัดการตัวแปรการตั้งค่าของระบบ</param>
        public SettingController(Services.ISettingService service)
        {
            _service = service;
        }

        /// <summary>
        /// ดึงรายการการกำหนดค่าของระบบทั้งหมด
        /// </summary>
        /// <returns>รายการการตั้งค่าระบบ</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Setting>>> GetSettings()
        {
            return Ok(await _service.GetSettingsAsync());
        }

        /// <summary>
        /// อัปเดตแพ็กเกจของการกำหนดค่าเพื่อการเปลี่ยนแปลงและควบคุมพฤติกรรมของระบบ
        /// </summary>
        /// <param name="setting">ระบบการตั้งค่าที่จะปรับปรุง</param>
        /// <returns>สถานะความสำเร็จจาการปรับตัวแปรตั้งต้น</returns>
        [HttpPut("Update")]
        public async Task<IActionResult> UpdateSetting([FromBody] Setting setting)
        {
            var result = await _service.UpdateSettingAsync(setting);
            if (result.Status == 404) return NotFound(result.Message);

            return Ok(new { message = result.Message });
        }
        
        /// <summary>
        /// สร้างเงื่อนไขการตั้งค่าระบบให้รองรับตัวแปรล่วงหน้า
        /// </summary>
        /// <param name="setting">เนื้อหาตัวแปรข้อมูลบรรทัดใหม่</param>
        /// <returns>การตั้งค่าที่ระบุข้อมูลบรรจุลงระบบแล้ว</returns>
        [HttpPost]
        public async Task<ActionResult<Setting>> CreateSetting(Setting setting)
        {
            var createdSetting = await _service.CreateSettingAsync(setting);
            return CreatedAtAction(nameof(GetSettings), new { id = createdSetting.Id }, createdSetting);
        }
    }
}