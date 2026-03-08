using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Backend.Controllers; // necessary to access the DTOs

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซบริการจัดการคุณสมบัติและวงจรชีวิตของผ้า
    /// </summary>
    public interface ILinenService
    {
        /// <summary>
        /// เฝ้าคอยตรวจจับและดำเนินการเปลี่ยนสถานะจากเครื่องสแกน RFID
        /// </summary>
        /// <param name="request">ข้อมูลคำสั่งให้สแกนพร้อมรายละเอียดจุดที่อ่าน</param>
        /// <returns>สถานะผลลัพธ์พร้อมข้อมูลอ้างอิง</returns>
        Task<(int Status, string? Message, object? Data)> ScanProcessAsync(ScanRequestDto request);

        /// <summary>
        /// ดึงข้อมูลรายการผ้าทั้งหมดที่ขึ้นทะเบียนในระบบ
        /// </summary>
        /// <returns>กลุ่มผ้าและข้อมูลเฉพาะของทุกรายการ</returns>
        Task<IEnumerable<Linen>> GetLinensAsync();

        /// <summary>
        /// ค้นหาผ้าจากรหัสประจำตัวผ้า
        /// </summary>
        /// <param name="rfid">รหัส RFID</param>
        /// <returns>เนื้อผ้าที่ค้นพบในทะเบียน</returns>
        Task<IEnumerable<Linen>> SearchLinenAsync(string rfid);

        /// <summary>
        /// ค้นหาและดูประวัติของผ้าที่มีการทำเรื่องจำหน่ายหรือตั้งทิ้ง
        /// </summary>
        /// <returns>บันทึกประวัติร่องรอยการจำหน่ายผ้า</returns>
        Task<IEnumerable<object>> GetDiscardHistoryAsync();

        /// <summary>
        /// ตรวจสอบดูข้อมูลผ้าที่ถูกลบไปแบบถาวรแล้ว
        /// </summary>
        /// <returns>ประวัติความเคลื่อนไหวถึงจุดจบล่าสุดก่อนนำออก</returns>
        Task<IEnumerable<object>> GetDeleteHistoryAsync();

        /// <summary>
        /// สะท้อนการมอนิเตอร์สถานะผ่านอุปกรณ์สแกนโดยดึงสถานะใหม่ล่าสุดออกมา
        /// </summary>
        /// <returns>ตัวข้อมูลการสแกนล่าสุดที่บันทึกในฐานระบบ</returns>
        Task<(int Status, string? Message, object? Data)> GetLatestMonitorAsync();

        /// <summary>
        /// ลงบันทึกเพื่อเปลี่ยนสถานะของผ้าชิ้นนั้นให้กลายเป็นผ้าชำรุด (ทิ้ง/จำหน่าย)
        /// </summary>
        /// <param name="payload">โครงสร้างข้อมูลเหตุผลและรหัสผ้า</param>
        /// <returns>สถานะความสำเร็จจากการบันทึกผลการจำหน่าย</returns>
        Task<(int Status, string? Message)> DiscardLinenAsync(DiscardPayload payload);

        /// <summary>
        /// ติดตั้งลงทะเบียนข้อมูลผ้าชิ้นใหม่เข้าสู่ระเบียบของระบบ
        /// </summary>
        /// <param name="linen">รูปแบบโครงสร้างเนื้อผ้าตั้งต้น</param>
        /// <returns>ข้อความอธิบายการเพิ่มสำเร็จรวมถึงข้อมูลชิ้นใหม่</returns>
        Task<(int Status, string? Message, Linen? Item)> PostLinenAsync(Linen linen);

        /// <summary>
        /// ลงทะเบียนรหัสผ้าจำนวนมากพร้อมกันเข้าสู่ระบบผ่านรอบเครื่องอ่าน
        /// </summary>
        /// <param name="request">กระบวนความคำขอลงทะเบียนผ้าประเภทเดียวกัน</param>
        /// <returns>สรุปผลความสำเร็จและรายการที่ซ้ำ</returns>
        Task<(int Status, string? Message, object? Data)> RegisterBatchAsync(RegisterBatchDto request);

        /// <summary>
        /// สั่งการให้ระงับและลบการมีอยู่ของเนื้อผ้า
        /// </summary>
        /// <param name="id">รหัสผ่านหลักในตารางแม่</param>
        /// <returns>สถานะตรรกะว่าการทำลายสมบูรณ์ตามความต้องการ</returns>
        Task<bool> DeleteLinenAsync(int id);

        /// <summary>
        /// ลดงานด้วยระบบอนุมัติลงบัญชีผ้าชำรุดรายกลุ่มในครั้งเดียว
        /// </summary>
        /// <param name="request">โครงข้อมูลสำหรับคัดผ้าเสียออกแบบเหมาทีละเยอะ</param>
        /// <returns>สถานะประเมินความสมบูรณ์ในการปรับเปลี่ยนลอจิกจำหน่าย</returns>
        Task<(int Status, string? Message)> DiscardBatchAsync(DiscardBatchDto request);

        /// <summary>
        /// เคลียร์ประวัติรหัสผ้าให้พ้นระบบเป็นชุดใหญ่อย่างรวดเร็ว
        /// </summary>
        /// <param name="rfidCodes">เก็บรายการรหัสสำหรับให้เคลียร์ทิ้ง</param>
        /// <returns>รหัสสถานะความสะดวกเรียบร้อยในขั้นตอนการลบ</returns>
        Task<(int Status, string? Message)> DeleteBatchAsync(List<string> rfidCodes);

        /// <summary>
        /// เรียกดูความเป็นไปได้และข้อเสนอที่เกี่ยวข้องกับหมวดทิ้งซาก
        /// </summary>
        /// <returns>ข้อมูลจัดสรรสำหรับจำหน่ายทิ้งอรรถประโยชน์</returns>
        Task<IEnumerable<object>> GetDiscardCandidatesAsync();

        /// <summary>
        /// รับค่าตัวแปรสถิติจำนวนรวมต่างๆ ไปแสดงหน้าจอ
        /// </summary>
        /// <returns>รวบรวมดัชนีภาพรวมทั้งหมดส่งให้แดชบอร์ด</returns>
        Task<object> GetDashboardStatsAsync();

        /// <summary>
        /// ระบบแจ้งเตือนปริมาณผ้าและสถานะขาดเหลือให้ทราบ
        /// </summary>
        /// <returns>รายการสารที่จะถูกหยิบไปแจ้งผู้ใช้งานระบบ</returns>
        Task<IEnumerable<object>> GetNotificationsAsync();

        /// <summary>
        /// ปะติดแผ่นข้อความหมายเหตุเข้าไปที่ประวัติการอ่านของระบบเพื่อใช้อ้างอิง
        /// </summary>
        /// <param name="logId">รหัสจุดประสงค์จดโน้ต</param>
        /// <param name="dto">ข้อความส่งต่อแทรกลงประวัติ</param>
        /// <returns>เนื้อหาสาระของสิ่งอัปเดตที่เสริมเข้ามาสำเร็จ</returns>
        Task<(int Status, string? Message, string? Description)> AddLogNoteAsync(int logId, UpdateLogNoteDto dto);
    }
}
