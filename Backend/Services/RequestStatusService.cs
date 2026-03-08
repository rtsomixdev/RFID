using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการรวบรวมสถานะวงจรชีวิตของใบเบิกและข้อมูลอ้างอิงการจัดส่ง
    /// </summary>
    public class RequestStatusService : IRequestStatusService
    {
        private readonly LinenDbContext _context;

        public RequestStatusService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ดึงรายการสถานะใบเบิกที่เป็นไปได้ทั้งหมด
        /// </summary>
        /// <returns>ข้อมูลแจกแจงสถานะต่างๆ ในกระบวนการ</returns>
        public async Task<IEnumerable<RequestStatus>> GetAsync()
        {
            return await _context.RequestStatuses.ToListAsync();
        }

        /// <summary>
        /// เรียกข้อมูลหมวดหมู่สถานะเจาะจงรายไอดี
        /// </summary>
        /// <param name="id">รหัสอ้างอิงไอดีสถานะ</param>
        /// <returns>ป้ายชื่อและข้อมูลของสถานะนั้น</returns>
        public async Task<RequestStatus?> GetAsync(int id)
        {
            return await _context.RequestStatuses.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มหมวดหมู่สถานะหรือการบ่งบอกระยะขั้นตอนใหม่
        /// </summary>
        /// <param name="item">ประเภทสถานะใหม่</param>
        /// <returns>รูปแบบข้อมูลสถานะที่เพิ่มสำเร็จ</returns>
        public async Task<RequestStatus> PostAsync(RequestStatus item)
        {
            _context.RequestStatuses.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงคำอธิบายความหมายของสถานะนั้นๆ
        /// </summary>
        /// <param name="id">รหัสผ่านสถานะที่จะเปลี่ยนแปลง</param>
        /// <param name="item">ความหมายสถานะใหม่</param>
        /// <returns>หลักฐานความสำเร็จบันทึกฐานข้อมูล</returns>
        public async Task<bool> PutAsync(int id, RequestStatus item)
        {
            if (id != item.StatusId) return false;

            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// เอาหมวดสถานะใบเบิกที่ไม่ได้ใช้งานอ้างอิงออก
        /// </summary>
        /// <param name="id">ไอดีเป้าหมาย</param>
        /// <returns>ผลการลบข้อมูลสถานะ</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.RequestStatuses.FindAsync(id);
            if (item == null) return false;

            _context.RequestStatuses.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
