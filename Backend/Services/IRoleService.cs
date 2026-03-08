using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;
using Backend.Controllers; // To access RoleDto

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซควบคุมจัดการกลุ่มสิทธิ์และระดับการเข้าถึงของผู้ใช้งาน
    /// </summary>
    public interface IRoleService
    {
        /// <summary>
        /// รวบรวมกลุ่มสิทธิ์ของผู้ใช้งานแบบทั้งหมด
        /// </summary>
        /// <returns>รายชื่อโครงสร้างระดับสิทธิ์ที่ระบบรองรับ</returns>
        Task<IEnumerable<object>> GetRolesAsync();

        /// <summary>
        /// ดึงย่อยของอำนาจหรือสิทธิ์การอนุญาตทุกข้อ
        /// </summary>
        /// <returns>การอนุญาตทั้งหมดสำหรับการดำเนินการเชิงลึก</returns>
        Task<IEnumerable<Permission>> GetAllPermissionsAsync();

        /// <summary>
        /// เจาะจงตัวระดับสิทธิ์หรือบทบาทด้วยรหัส
        /// </summary>
        /// <param name="id">รหัสเลขที่บอกบทบาท</param>
        /// <returns>ข้อมูลภาพรวมของบทบาทนั้น ๆ</returns>
        Task<object?> GetRoleAsync(int id);

        /// <summary>
        /// กำหนดสร้างบทบาทกลุ่มสิทธิ์ใหม่เตรียมไว้ให้ผู้ใช้งาน
        /// </summary>
        /// <param name="dto">โครงสร้างบทบาทและการตั้งสิทธิ์</param>
        /// <returns>รายงานผลจากการผูกสร้างใหม่</returns>
        Task<(int Status, string? Message, Role? Item)> CreateRoleAsync(RoleDto dto);

        /// <summary>
        /// อัปเดตปรับเปลี่ยนสิทธิและบทบาทของผู้ครอบครองระดับนี้
        /// </summary>
        /// <param name="id">รหัสที่ชี้วัดเป้าหมายบทบาท</param>
        /// <param name="dto">คุณสมบัติการเข้าถึงหรือชื่อที่แปรไป</param>
        /// <returns>รายงานการรับทราบว่าเปลี่ยนแปลงผลบังคับใช้ใหม่ได้สำเร็จ</returns>
        Task<(int Status, string? Message)> UpdateRoleAsync(int id, RoleDto dto);

        /// <summary>
        /// ตัดกลุ่มผู้ใช้หรือสิทธิ์บทบาทนี้ออกไปจากองค์ประกอบระบบอย่างถาวร
        /// </summary>
        /// <param name="id">รหัสจุดยืนของบทบาทนั้น</param>
        /// <returns>การยินยอมลบและการติดขัดหากมีผู้ใช้อ้างอิงอยู่</returns>
        Task<(int Status, string? Message)> DeleteRoleAsync(int id);
    }
}
