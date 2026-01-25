import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom'; // ✅ เพิ่ม useLocation
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// ✅ Updated to match Sidebar.tsx
const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🔍 ตรวจสอบ Path ปัจจุบัน
  const location = useLocation();

  // กำหนดเงื่อนไข: ถ้าเป็นหน้าแรก ('/') หรือ Login ให้เป็น Full Screen (ไม่เอา Sidebar)
  const isFullScreenPage = location.pathname === '/' || location.pathname === '/login';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 🟢 CASE 1: ถ้าเป็นหน้า Monitor (Home) หรือ Login -> แสดงเต็มจอโล่งๆ
  if (isFullScreenPage) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <CssBaseline />
        <Outlet /> {/* แสดงผลหน้า Home.tsx หรือ Login.tsx เต็มจอ */}
      </Box>
    );
  }

  // 🔒 CASE 2: ถ้าเป็นหน้า Admin (Dashboard ฯลฯ) -> แสดง Sidebar + Navbar ปกติ
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* 1. Navbar: Fixed at top */}
      <Navbar onMenuClick={handleDrawerToggle} />

      {/* 2. Sidebar: Permanent on desktop, temporary on mobile */}
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />

      {/* 3. Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: '#f8fafc',
          marginTop: '64px' // Add top margin for the fixed Navbar
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;