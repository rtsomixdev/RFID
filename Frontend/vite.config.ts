import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, 
    proxy: {
      '/api': {
        //แก้ตรงนี้: เปลี่ยนจาก http://linen_api:8080 เป็น localhost
        //สำคัญ: เลข 5134 ต้องตรงกับที่ขึ้นใน Terminal ตอนคุณรัน 'dotnet watch run'
        // (ถ้ามันขึ้น port อื่น เช่น 5000, 5200 ให้แก้เลขตรงนี้ตามครับ)
        target: 'http://localhost:5134', 
        changeOrigin: true,
        secure: false, // ใส่ไว้เผื่อ Backend เป็น HTTPS (Self-signed) จะได้ไม่ error
      }
    }
  },
})