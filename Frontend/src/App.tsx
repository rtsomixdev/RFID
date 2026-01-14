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
import Home from './pages/Home'; 
import Hospital from './pages/Hospital';
import Vendor from './pages/Vendor';
import Users from './pages/Users';
import Linen from './pages/Linen';
import Requests from './pages/Requests';
import Discard from './pages/Discard';
import Laundry from './pages/Laundry'; 
import Reports from './pages/Reports';
import Transport from './pages/Transport';
import Settings from './pages/Settings';

// ✅ เพิ่ม Import หน้า Notification ที่สร้างใหม่
import NotificationsPage from './pages/Notifications';

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  
  const userStr = localStorage.getItem('currentUser');
  const isLoggedIn = !!userStr;

  const isAuthPage = location.pathname === '/login' || location.pathname === '/forgot-password';

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  if (isAuthPage || !isLoggedIn) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', p: isAuthPage ? 0 : 3 }}>
         <Outlet />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Navbar onMenuClick={handleDrawerToggle} />
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - 280px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

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
          <Route element={<AppLayout />}>
            
            {/* 1. หน้า Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* 2. หน้า Admin */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            <Route path="/hospital" element={<ProtectedRoute><Hospital /></ProtectedRoute>} />
            <Route path="/linens" element={<ProtectedRoute><Linen /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><Vendor /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            
            <Route path="/laundry" element={<ProtectedRoute><Laundry /></ProtectedRoute>} />
            <Route path="/discard" element={<ProtectedRoute><Discard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

            <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* ✅ เพิ่ม Route สำหรับหน้า Notification */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            
            <Route path="/rfid-connect" element={<ProtectedRoute><ComingSoon title="เชื่อมต่อ RFID" /></ProtectedRoute>} />
            <Route path="/readers" element={<ProtectedRoute><ComingSoon title="เพิ่มอุปกรณ์ RFID" /></ProtectedRoute>} />
          
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;