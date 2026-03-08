using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริหารจัดการใบคำขอการเบิกจ่ายผ้า
    /// </summary>
    public interface IRequestService
    {
        /// <summary>
        /// ดึงกลุ่มใบคำขอเบิกจ่ายทั้งหมดในระบบ
        /// </summary>
        /// <returns>รายการใบคำขอเบิกจ่าย</returns>
        Task<IEnumerable<Request>> GetRequestsAsync();

        /// <summary>
        /// ค้นหาใบคำขอด้วยรหัสคำขอ
        /// </summary>
        /// <param name="id">รหัสอ้างอิงของใบคำขอ</param>
        /// <returns>ข้อมูลรายละเอียดใบคำขอตามที่ระบุ</returns>
        Task<Request?> GetRequestAsync(int id);

        /// <summary>
        /// ประเมินหรือตรวจสอบปริมาณสินค้าระดับสต๊อกก่อนสร้างคำขอ
        /// </summary>
        /// <param name="productId">รหัสผลิตภัณฑ์ผ้า</param>
        /// <returns>ยอดผ้าที่มีให้เบิกจ่ายได้</returns>
        Task<object> CheckStockAsync(int productId);

        /// <summary>
        /// เปิดใบคำขอเบิกจ่ายสินค้าใหม่
        /// </summary>
        /// <param name="request">โครงสร้างข้อมูลใบคำขอ</param>
        /// <returns>สถานะความสมบูรณ์และรายละเอียดเอกสาร</returns>
        Task<(int Status, string? Message, Request? Item)> PostRequestAsync(Request request);

        /// <summary>
        /// บันทึกการเปลี่ยนแปลงแก้ไขรายละเอียดใบคำขอ
        /// </summary>
        /// <param name="id">รหัสใบคำขอ</param>
        /// <param name="request">ข้อมูลชุดใหม่</param>
        /// <returns>สถานะแสดงผลการแก้ไข</returns>
        Task<(int Status, string? Message)> PutRequestAsync(int id, Request request);

        /// <summary>
        /// อัปเดตสถานการณ์และข้อมูลการติดตามการขนส่งใบคำขอนี้
        /// </summary>
        /// <param name="id">รหัสอ้างอิงใบคำขอ</param>
        /// <param name="dto">ข้อมูลกำหนดสถานะการจัดส่งที่อัปเดต</param>
        /// <returns>รหัสสถานะและข้อมูลความเคลื่อนไหว</returns>
        Task<(int Status, string? Message, object? Data)> UpdateTrackingAsync(int id, UpdateRequestTrackingDto dto);

        /// <summary>
        /// ยกเลิกใบคำขอเบิกจ่ายที่ไม่ต้องการดำเนินการต่อ
        /// </summary>
        /// <param name="id">รหัสใบคำขอที่เลือกยกเลิก</param>
        /// <returns>ความสามารถหรือผลลัพธ์จากการอนุมัติยกเลิก</returns>
        Task<(int Status, string? Message)> CancelRequestAsync(int id);
    }
}
