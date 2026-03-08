import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const drawerWidth = 280;

/**
 * โครงสร้างเลย์เอาต์หลักของแอปพลิเคชัน
 * ทำหน้าที่คอยประกอบส่วนหัว (Navbar) ด้านข้าง (Sidebar) และพื้นที่เนื้อหาตรงกลาง (Outlet)
 * 
 * @returns {JSX.Element} เลย์เอาต์หลักพร้อมส่วนเนื้อหาย่อย
 */
const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isLoginPage = location.pathname === '/login';
  const isGuestHome = location.pathname === '/' && !user;

  const shouldHideSidebar = isLoginPage || isGuestHome;

  // กรณีซ่อนแถบเมนูด้านข้าง เช่น หน้าแรกตอนยังไม่มีเซสชั่นเซิร์ฟเวอร์ หรือหน้าเข้าสู่ระบบ
  if (shouldHideSidebar) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        <Outlet />
      </Box>
    );
  }

  // กรณีผ่านการรับรองสิทธิ์ แสดงแถบเมนูด้านข้างและแถบนำทางด้านบนปกติตามโครงร่าง
  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <CssBaseline />

      <Navbar onMenuClick={handleDrawerToggle} />

      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;