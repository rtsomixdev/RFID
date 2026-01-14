import axios from '../api/axiosClient';

/**
 * ฟังก์ชันส่งแจ้งเตือนเข้าสู่ระบบ (ใช้ได้ทุกหน้า)
 * @param title หัวข้อแจ้งเตือน
 * @param message รายละเอียด
 * @param type ประเภท: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER'
 * @param linkUrl (Optional) ลิงก์ที่กดแล้วจะไป (เช่น '/requests?id=1')
 * @param userId (Optional) ระบุคนรับ (ถ้าไม่ใส่ = เป็น null)
 * @param roleId (Optional) ระบุกลุ่มรับ (เช่น 1=Admin, 2=Head)
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