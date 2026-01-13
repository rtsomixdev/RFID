import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // อันเดิมที่คุณเพิ่งใส่
    // 👇 เพิ่มส่วนนี้เข้าไปครับ
    proxy: {
      '/api': {
        target: 'http://linen_api:8080', // ส่งไปหา Container Backend โดยตรง
        changeOrigin: true,
        secure: false,
      }
    }
  },
})