import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// Must match Sidebar.tsx
const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // 1️⃣ User Check
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 2️⃣ Visibility Logic
  const isLoginPage = location.pathname === '/login';
  const isGuestHome = location.pathname === '/' && !user;

  const shouldHideSidebar = isLoginPage || isGuestHome;

  // 🟢 CASE 1: Hide Sidebar
  if (shouldHideSidebar) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <CssBaseline />
        <Outlet />
      </Box>
    );
  }

  // 🔒 CASE 2: Show Sidebar
  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Navbar receives toggle handler */}
      <Navbar onMenuClick={handleDrawerToggle} />

      {/* Sidebar Component */}
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 }, // Responsive padding
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }} /> {/* Spacer for Fixed Navbar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;