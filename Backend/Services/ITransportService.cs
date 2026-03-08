using System.Threading.Tasks;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซดูแลรับผิดชอบระบบขนส่งและเคลื่อนย้ายข้อมูลสินค้า
    /// </summary>
    public interface ITransportService
    {
        /// <summary>
        /// ประสานงานลงบันทึกจัดส่งผ้าหรือสินค้าออกจากสถานที่หนึ่ง
        /// </summary>
        /// <param name="input">พารามิเตอร์กลุ่มผ้าเพื่อสร้างรายการย้ายของ</param>
        /// <returns>รหัสยืนยันพร้อมระบุจุดหมายเส้นทางจัดส่ง</returns>
        Task<(int Status, string? Message, string? ResultStatus)> DispatchAsync(TransportDto input);

        /// <summary>
        /// ตรวจรับและนำรายการสินค้ากลับเข้ามาถึงที่หมาย
        /// </summary>
        /// <param name="input">ชุดรหัสการรับและรหัสสถานี</param>
        /// <returns>สถานะความยินยอมการรับสินค้าเสร็จสมบูรณ์</returns>
        Task<(int Status, string? Message, string? Location)> ReceiveAsync(TransportDto input);
    }
}
