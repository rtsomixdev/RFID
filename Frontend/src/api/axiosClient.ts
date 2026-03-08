import axios from 'axios';

/**
 * อินสแตนซ์ของ Axios ที่ตั้งค่าสำหรับการเชื่อมต่อกับ Backend API หลักของระบบ
 * บังคับให้ส่งและรับ Cookie (HttpOnly Session) เพื่อการจัดการสถานะล็อกอินและสิทธิ์
 */
const axiosClient = axios.create({
  baseURL: 'https://api.rfidtracking.space/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // ล้างข้อมูลผู้ใช้ในระบบและดีดผู้ใช้กลับไปยังหน้าล็อกอินกรณีที่รอบเซสชั่นหมดอายุ
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('currentUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;