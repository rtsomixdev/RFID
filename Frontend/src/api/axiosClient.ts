import axios from 'axios';

// ไม่ต้องเช็ค localhost หรือ domain แล้ว ให้ใช้ '/api' อย่างเดียวเลย
// เดี๋ยว Vite Proxy จะจัดการเลือกทางไปต่อให้เอง
const axiosClient = axios.create({
  baseURL: '/api', 
  withCredentials: true, // ✅ สำคัญมาก: สั่งให้ Axios ส่ง HttpOnly Cookie (Session) ไปกับทุก Request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor (คงเดิมไว้)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // ✅ ถ้า Session หมดอายุ หรือไม่มีสิทธิ์ (401) จะล้างข้อมูลหน้าเว็บและดีดกลับไปหน้า Login
      localStorage.removeItem('currentUser');
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default axiosClient;