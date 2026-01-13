import axios from 'axios';

// ไม่ต้องเช็ค localhost หรือ domain แล้ว ให้ใช้ '/api' อย่างเดียวเลย
// เดี๋ยว Vite Proxy จะจัดการเลือกทางไปต่อให้เอง
const axiosClient = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor (คงเดิมไว้)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // window.location.href = '/login'; // เปิดใช้อันนี้ถ้าต้องการให้ดีด log out
    }
    return Promise.reject(error);
  }
);

export default axiosClient;