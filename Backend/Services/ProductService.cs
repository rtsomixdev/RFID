using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.Controllers;

namespace Backend.Services
{
    /// <summary>
    /// บริการจัดการข้อมูลหลักของประเภทและชนิดสินค้าผ้า
    /// </summary>
    public class ProductService : IProductService
    {
        private readonly LinenDbContext _context;

        public ProductService(LinenDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// เรียกข้อมูลสินค้าพร้อมหมวดหมู่ที่เกี่ยวข้องทั้งหมด
        /// </summary>
        /// <returns>ชุดข้อมูลรายการสินค้าผ้า</returns>
        public async Task<IEnumerable<Product>> GetAsync()
        {
            return await _context.Products
                .Include(p => p.Category) 
                .ToListAsync();
        }

        /// <summary>
        /// ดึงข้อมูลสินค้าเฉพาะเจาะจงตามรหัส
        /// </summary>
        /// <param name="id">รหัสอ้างอิงสินค้า</param>
        /// <returns>รายละเอียดของสินค้านั้น</returns>
        public async Task<Product?> GetAsync(int id)
        {
            return await _context.Products.FindAsync(id);
        }

        /// <summary>
        /// เพิ่มรายการสินค้าชิ้นใหม่เข้าสู่ระบบ
        /// </summary>
        /// <param name="item">ข้อมูลสินค้าใหม่</param>
        /// <returns>รายการสินค้าที่เพิ่มสำเร็จ</returns>
        public async Task<Product> PostAsync(Product item)
        {
            _context.Products.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        /// <summary>
        /// ปรับปรุงเงื่อนไขหรือกฎเกณฑ์ของสินค้า
        /// </summary>
        /// <param name="id">รหัสอ้างอิงสินค้า</param>
        /// <param name="item">ข้อมูลกฎเงื่อนไขที่ต้องการแก้ไข</param>
        /// <returns>สถานะความสำเร็จและข้อมูลสินค้าล่าสุด</returns>
        public async Task<(int Status, string? Message, Product? Item)> PutAsync(int id, ProductRulesUpdateDto item)
        {
            if (id != item.ProductId) return (400, "ID ไม่ตรงกัน", null);

            var existingProduct = await _context.Products.FindAsync(id);
            
            if (existingProduct == null) return (404, "ไม่พบสินค้า", null);

            // อัปเดตข้อมูลเดิมที่มีอยู่แล้ว
            existingProduct.MaxWashCount = item.MaxWashCount;
            existingProduct.MaxLifespanDays = item.MaxLifespanDays;
            
            // 🟢 ส่วนที่เพิ่มใหม่: อัปเดตชื่อสินค้าหากมีการส่งค่าเข้ามา
            if (!string.IsNullOrWhiteSpace(item.ProductName))
            {
                existingProduct.ProductName = item.ProductName;
            }
            
            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Products.AnyAsync(e => e.ProductId == id)) return (404, null, null);
                else throw;
            }

            return (200, null, existingProduct);
        }

        /// <summary>
        /// ลบข้อมูลสินค้าออกแบบถาวร
        /// </summary>
        /// <param name="id">รหัสอ้างอิงสินค้า</param>
        /// <returns>ความสำเร็จของการลบข้อมูล</returns>
        public async Task<bool> DeleteAsync(int id)
        {
            var item = await _context.Products.FindAsync(id);
            if (item == null) return false;
            
            _context.Products.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// สรุปยอดข้อมูลสินค้าที่มีในคลังเพื่อการส่งออกรายงาน
        /// </summary>
        /// <returns>ก้อนข้อมูลสำหรับการนำไปใช้พิมพ์รายงาน</returns>
        public async Task<(int Status, string? Message, IEnumerable<object>? Data)> GetStockForExportAsync()
        {
            try
            {
                var data = await (from l in _context.Linens  
                                  join p in _context.Products on l.ProductId equals p.ProductId
                                  join c in _context.Categories on p.CategoryId equals c.CategoryId
                                  where l.IsActive == true
                                  orderby p.ProductCode
                                  select new
                                  {
                                      fabric_category = c.CategoryName,
                                      fabric_type = p.ProductName,
                                      fabric_no = p.ProductCode,
                                      fabric_detail = p.SizeSpec, 
                                      fabric_unit = p.UnitName ?? "ชิ้น", 
                                      rfid_code = l.RfidCode         
                                  }).ToListAsync();

                return (200, null, data);
            }
            catch (Exception ex)
            {
                return (500, "Export Error: " + ex.Message, null);
            }
        }
    }
}