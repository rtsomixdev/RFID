import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';

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
import NotificationsPage from './pages/Notifications';
import RfidConnect from './pages/RfidConnect';

import MainLayout from './layouts/MainLayout';

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

// Wrapper สำหรับตรวจสอบสิทธิ์ (Auth Check)
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
          {/* 1. Public Pages (หน้า Login แยกต่างหาก ไม่มี Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* 2. Main Layout Structure */}
          <Route element={<MainLayout />}>

            {/* 🟢 PUBLIC ACCESS: หน้า Home (Monitor) เข้าได้ทุกคน ไม่ต้อง Login */}
            <Route path="/" element={<Home />} />

            {/* 🔒 PROTECTED AREA: ส่วนจัดการระบบ ต้อง Login ก่อน */}
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

            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/rfid-connect" element={<ProtectedRoute><RfidConnect /></ProtectedRoute>} />

            <Route path="/readers" element={<ProtectedRoute><ComingSoon title="เพิ่มอุปกรณ์ RFID" /></ProtectedRoute>} />

          </Route>

          {/* Fallback: ถ้า URL ไม่ตรงกับอะไรเลย ให้กลับไปหน้า Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;