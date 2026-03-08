using System.Threading.Tasks;

namespace Backend.Services
{
    /// <summary>
    /// อินเทอร์เฟซสำหรับตัวจัดการหน้าปัดระบบสถิติ (Dashboard)
    /// </summary>
    public interface IDashboardService
    {
        /// <summary>
        /// สรุปภาพรวมและสถิติพื้นฐานประจำสาขา
        /// </summary>
        /// <returns>ก้อนรูปแบบข้อมูล (Object) ของจำนวนปริมาณรายการที่สำคัญ</returns>
        Task<object> GetStatsAsync();

        /// <summary>
        /// รายงานรูปแบบโครงสร้างข้อมูลสำหรับหน้ากราฟและการดูตัวเลขทางลึก
        /// </summary>
        /// <returns>วัตถุชุดรวมข้อมูลที่สามารถใช้สร้างกราฟวงกลมหรือกราฟแท่งได้ทันที</returns>
        Task<object> GetChartDataAsync();
    }
}
