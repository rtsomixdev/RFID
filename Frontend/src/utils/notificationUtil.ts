import axios from '../api/axiosClient';

/**
 * ฟังก์ชันส่วนกลางสำหรับส่งข้อความแจ้งเตือนป้อนเข้าสู่ระบบ
 * 
 * @param {string} title - หัวข้อหรือชื่อเรื่องการแจ้งเตือน
 * @param {string} message - ข้อความรายละเอียดประกอบ
 * @param {'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'ERROR'} [type='INFO'] - ระดับความสำคัญของข้อความ
 * @param {string} [linkUrl=''] - เส้นทาง URL ที่เกี่ยวข้องเมื่อผู้ใช้คลิกคำแจ้งเตือน
 * @param {number} [userId] - รหัสผู้ใช้เป้าหมาย หากไม่ระบุจะเป็นตัวเลือกว่างอ้างอิงทุกบัญชี
 * @param {number} [roleId] - รหัสตำแหน่งสิทธิ์กลุ่มเป้าหมาย หากไม่ระบุจะเป็นตัวเลือกว่าง
 * @returns {Promise<void>}
 */
export const sendNotification = async (
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'ERROR' = 'INFO',
  linkUrl: string = '',
  userId?: number,
  roleId?: number
) => {
  try {
    // ยิงคำสั่งสร้างบันทึกการแจ้งเตือนไปยังฐานข้อมูลเพื่อกระจายข้อมูล
    await axios.post('/Notification/Create', {
      title,
      message,
      type,
      linkUrl,
      userId,
      roleId
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};