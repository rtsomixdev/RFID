import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// ✅ ต้องตรงกับ Sidebar.tsx (260px)
const drawerWidth = 260; 

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* 1. Navbar: อยู่บนสุดเสมอ */}
      <Navbar onSidebarOpen={handleDrawerToggle} />
      
      {/* 2. Sidebar: อยู่ทางซ้าย */}
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      
      {/* 3. Main Content: เนื้อหาหลักตรงกลาง */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` }, // คำนวณความกว้างที่เหลือจาก Sidebar
          minHeight: '100vh',
          bgcolor: '#f8fafc' // สีพื้นหลังเทาอ่อน
        }}
      >
        <Toolbar /> {/* ดันเนื้อหาลงมาไม่ให้โดน Navbar ทับ */}
        <Outlet />  {/* จุดแสดงผลของหน้าต่างๆ (Dashboard, Hospital, etc.) */}
      </Box>
    </Box>
  );
};

export default MainLayout;