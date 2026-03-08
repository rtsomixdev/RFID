using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการบริหารจัดการข้อมูลพื้นที่และห้องต่างๆ ภายในวอร์ด
    /// </summary>
    public class RoomService : IRoomService
    {
        private readonly LinenDbContext _context;

        public RoomService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ค้นหารายการห้องหรืออาณาบริเวณทั้งหมด
        /// </summary>
        /// <returns>โครงสร้างและพื้นที่ทั้งหมดบนระบบ</returns>
        public async Task<IEnumerable<Room>> GetAsync()
        {
            return await _context.Rooms.ToListAsync();
        }

        /// <summary>
        /// เรียกเฉพาะข้อมูลตำแหน่งของแต่ละห้องเจาะจงรายไอดี
        /// </summary>
        /// <param name="id">รหัสของห้องหรือสถานที่</param>
        /// <returns>ข้อมูลแสดงรายละเอียดของพื้นที่</returns>
        public async Task<Room?> GetAsync(int id)
        {
            return await _context.Rooms.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มระเบียนอาณาบริเวณใหม่เข้าสู่ระบบสถานที่
        /// </summary>
        /// <param name="item">อ็อบเจกต์หน้าข้อมูลพื้นที่ห้อง</param>
        /// <returns>ผลการตอบรับบันทึกฐานข้อมูลลงล็อก</returns>
        public async Task<Room> PostAsync(Room item)
        {
            _context.Rooms.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงป้ายชื่อหรือรายละเอียดพื้นที่เฉพาะรายรหัส
        /// </summary>
        /// <param name="id">รหัสอ้างอิงตำแหน่งห้อง</param>
        /// <param name="item">โครงร่างข้อมูลห้องที่ต้องการแก้ไขใหม่</param>
        /// <returns>ร่องรอยการปรับเปลี่ยนข้อมูลสำเร็จ</returns>
        public async Task<bool> PutAsync(int id, Room item)
        {
            if (id != item.RoomId) return false;

            _context.Entry(item).State = EntityState.Modified;
            
            try 
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Rooms.AnyAsync(r => r.RoomId == id)) return false;
                else throw;
            }
        }

        /// <summary>
        /// ถอนพื้นที่สถานที่ตัวนี้ออกจากสารบบฐานข้อมูล
        /// </summary>
        /// <param name="id">เลขอ้างอิงสถานที่ห้องรับผิดชอบ</param>
        /// <returns>สถานะความสำเร็จของธุรกรรมการลบทิ้ง</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.Rooms.FindAsync(id);
            if (item == null) return false;

            _context.Rooms.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
