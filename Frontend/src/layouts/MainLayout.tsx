import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// ✅ Updated to match Sidebar.tsx
const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
        {/* We can remove Toolbar here if we use marginTop, or keep it for spacer */}
        {/* <Toolbar /> */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;