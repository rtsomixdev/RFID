import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home'; // Monitor Page

import Hospital from './pages/Hospital';
import Vendor from './pages/Vendor';
import Users from './pages/Users';
import Linen from './pages/Linen';
import Requests from './pages/Requests';

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* --- Public Routes (ยังไม่ได้ Login) --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* --- Protected Routes (ต้อง Login + มี Sidebar) --- */}
          {/* ✅ ย้ายหน้า Home เข้ามาในนี้ครับ */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} /> {/* หน้าแรกหลัง Login */}
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stats" element={<Dashboard />} />
            
            <Route path="/hospital" element={<Hospital />} />
            <Route path="/linens" element={<Linen />} />
            <Route path="/vendors" element={<Vendor />} />
            <Route path="/users" element={<Users />} />
            <Route path="/requests" element={<Requests />} />
            
            <Route path="/rfid-connect" element={<ComingSoon title="เชื่อมต่อ RFID" />} />
            <Route path="/damage" element={<ComingSoon title="แจ้งชำรุด" />} />
            <Route path="/readers" element={<ComingSoon title="เพิ่มอุปกรณ์ RFID" />} />
            <Route path="/settings" element={<ComingSoon title="ตั้งค่าระบบ" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;