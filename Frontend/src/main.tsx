import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * จุดเริ่มต้นการทำงานหลักของแอปพลิเคชัน React
 * ฝังคอมโพเนนต์ App หลักลงในโหนด DOM ของ HTML เพื่อเริ่มวาดการแสดงผล
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
