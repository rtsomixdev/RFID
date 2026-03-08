using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการป้ายระบุสิทธิพิเศษและแท็กเฉพาะกิจ
    /// </summary>
    public class SpecialTagService : ISpecialTagService
    {
        private readonly LinenDbContext _context;

        public SpecialTagService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// ค้นหารายการป้ายพิเศษทั้งหมดที่มีบันทึกไว้
        /// </summary>
        /// <returns>ชุดข้อมูลแท็กแบบจำเพาะพิเศษทั้งหมด</returns>
        public async Task<IEnumerable<SpecialTag>> GetSpecialTagsAsync()
        {
            return await _context.SpecialTags.ToListAsync();
        }

        /// <summary>
        /// สืบหาข้อมูลของแท็กพิเศษตัวใดตัวหนึ่ง
        /// </summary>
        /// <param name="id">รหัสชิปหรือหมวดหมู่แท็กพิเศษ</param>
        /// <returns>รายละเอียดที่ตรงกันของป้ายชื่อนั้น</returns>
        public async Task<SpecialTag?> GetSpecialTagAsync(string id)
        {
            return await _context.SpecialTags.FindAsync(id);
        }

        /// <summary>
        /// ลงทะเบียนป้ายระบุชื่อแบบพิเศษตัวใหม่เข้ากับระบบ
        /// </summary>
        /// <param name="tag">รายละเอียดป้ายแท็กพิเศษ</param>
        /// <returns>ข้อมูลแสดงการสร้างสำเร็จหรือรายการแจ้งเตือนป้ายซ้ำ</returns>
        public async Task<(int Status, string? Message, SpecialTag? Item)> PostSpecialTagAsync(SpecialTag tag)
        {
            if (await _context.SpecialTags.AnyAsync(e => e.TagId == tag.TagId))
            {
                return (409, $"Tag ID '{tag.TagId}' นี้มีอยู่ในระบบแล้ว", null);
            }

            _context.SpecialTags.Add(tag);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (_context.SpecialTags.Any(e => e.TagId == tag.TagId))
                {
                    return (409, "Tag ID already exists.", null);
                }
                else
                {
                    throw;
                }
            }

            return (201, null, tag);
        }

        /// <summary>
        /// อัปเดตข้อมูลควบประวัติของตัวป้ายพิเศษ
        /// </summary>
        /// <param name="id">หมายเลข ID แท็กที่บันทึกก่อนหน้า</param>
        /// <param name="tag">โครงข้อมูลที่นำมาแทนที่ของเก่า</param>
        /// <returns>ร่องรอยแสดงความสำเร็จการอัปเดต</returns>
        public async Task<(int Status, string? Message)> PutSpecialTagAsync(string id, SpecialTag tag)
        {
            if (id != tag.TagId)
            {
                return (400, "Tag ID mismatch");
            }

            _context.Entry(tag).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.SpecialTags.Any(e => e.TagId == id))
                {
                    return (404, "Tag not found");
                }
                else
                {
                    throw;
                }
            }

            return (204, null);
        }

        /// <summary>
        /// ปลดรหัสป้ายพิเศษออกจากฐานข้อมูล
        /// </summary>
        /// <param name="id">รหัสป้ายที่ต้องการถอนเลิก</param>
        /// <returns>ผลยืนยันการทำลายข้อมูลแท็ก</returns>
        public async Task<(int Status, string? Message)> DeleteSpecialTagAsync(string id)
        {
            var tag = await _context.SpecialTags.FindAsync(id);
            if (tag == null)
            {
                return (404, "Tag not found");
            }

            _context.SpecialTags.Remove(tag);
            await _context.SaveChangesAsync();

            return (204, null);
        }
    }
}
