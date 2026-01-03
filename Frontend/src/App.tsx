import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Toolbar } from '@mui/material';
import theme from './theme/theme';

// --- Imports Layouts ---
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// --- Imports Pages ---
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home'; // Monitor
import Hospital from './pages/Hospital';
import Vendor from './pages/Vendor';
import Users from './pages/Users';
import Linen from './pages/Linen';
import Requests from './pages/Requests';
import Discard from './pages/Discard';

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

// ✅ Smart Layout: ตัดสินใจเองว่าจะโชว์ Sidebar หรือไม่
const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  
  // 1. เช็คว่า Login หรือยัง?
  const userStr = localStorage.getItem('currentUser');
  const isLoggedIn = !!userStr; // เป็น True ถ้ามีข้อมูล User

  // 2. เช็คว่าเป็นหน้า Login หรือไม่ (หน้านี้ห้ามมี Sidebar เด็ดขาด)
  const isAuthPage = location.pathname === '/login' || location.pathname === '/forgot-password';

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // --- กรณีที่ 1: หน้า Login/Forgot หรือ ยังไม่ Login (โชว์เต็มจอ) ---
  if (isAuthPage || !isLoggedIn) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', p: isAuthPage ? 0 : 3 }}>
         <Outlet /> {/* แสดงเนื้อหาเต็มจอ */}
      </Box>
    );
  }

  // --- กรณีที่ 2: Login แล้ว (โชว์ Sidebar + Navbar ครบชุด) ---
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Navbar & Sidebar จะโผล่มาเฉพาะตอน Login แล้วเท่านั้น */}
      <Navbar onMenuClick={handleDrawerToggle} />
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - 280px)` } }}>
        <Toolbar /> {/* ดันเนื้อหาลงมาไม่ให้โดน Navbar ทับ */}
        <Outlet />
      </Box>
    </Box>
  );
};

// ตัวช่วยป้องกัน Route (ถ้ายังไม่ Login ห้ามเข้าหน้า Admin ลึกๆ)
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const userStr = localStorage.getItem('currentUser');
  if (!userStr) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          
          {/* ✅ ใช้ Layout ตัวเดียวคุมทั้งหมด */}
          <Route element={<AppLayout />}>
            
            {/* 1. หน้า Public (เข้าได้ทุกคน) */}
            <Route path="/" element={<Home />} /> {/* หน้า Monitor (URL เดียวกัน แต่ Layout เปลี่ยนตาม Login) */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* 2. หน้า Admin (ต้อง Login ถึงจะเข้าได้) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            <Route path="/hospital" element={<ProtectedRoute><Hospital /></ProtectedRoute>} />
            <Route path="/linens" element={<ProtectedRoute><Linen /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><Vendor /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/discard" element={<ProtectedRoute><Discard /></ProtectedRoute>} />
            
            <Route path="/rfid-connect" element={<ProtectedRoute><ComingSoon title="เชื่อมต่อ RFID" /></ProtectedRoute>} />
            <Route path="/readers" element={<ProtectedRoute><ComingSoon title="เพิ่มอุปกรณ์ RFID" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><ComingSoon title="ตั้งค่าระบบ" /></ProtectedRoute>} />
          
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;