import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5134/api', // URL ของ .NET Backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// เพิ่ม Interceptor เผื่อไว้ดักจับ Error (เช่น 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.location.href = '/login'; // ถ้า Session หลุดให้ดีดกลับหน้า Login
    }
    return Promise.reject(error);
  }
);

export default axiosClient;