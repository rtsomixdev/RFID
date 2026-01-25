import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// ✅ Updated to match Sidebar.tsx
const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // 1️⃣ ดึงข้อมูล User จาก LocalStorage (หรือ Context)
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 2️⃣ กำหนดเงื่อนไขใหม่:
  // - หน้า Login: ซ่อน Sidebar เสมอ
  // - หน้า Home ('/'): ซ่อน Sidebar "เฉพาะตอนที่ยังไม่ Login"
  const isLoginPage = location.pathname === '/login';
  const isGuestHome = location.pathname === '/' && !user; 

  const shouldHideSidebar = isLoginPage || isGuestHome;

  // 🟢 CASE 1: ซ่อน Sidebar (หน้า Login หรือ หน้า Home แบบ Guest)
  if (shouldHideSidebar) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <CssBaseline />
        <Outlet />
      </Box>
    );
  }

  // 🔒 CASE 2: แสดง Sidebar ปกติ (หน้า Admin หรือ หน้า Home แบบ Login แล้ว)
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <Navbar onMenuClick={handleDrawerToggle} />

      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: '#f8fafc',
          marginTop: '64px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;