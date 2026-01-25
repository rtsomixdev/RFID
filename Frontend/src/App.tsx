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

// ✅ Import หน้า RfidConnect ที่สร้างใหม่
import RfidConnect from './pages/RfidConnect';

import MainLayout from './layouts/MainLayout';

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

// New wrapper for Auth checks only, Layout is handled by MainLayout
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
          {/* 1. Public Pages (No Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* 2. Protected Pages (With Main Layout) */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />

            {/* Admin & Functional Pages */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stats" element={<Dashboard />} />

            <Route path="/hospital" element={<Hospital />} />
            <Route path="/linens" element={<Linen />} />
            <Route path="/vendors" element={<Vendor />} />
            <Route path="/users" element={<Users />} />
            <Route path="/requests" element={<Requests />} />

            <Route path="/laundry" element={<Laundry />} />
            <Route path="/discard" element={<Discard />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/transport" element={<Transport />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/notifications" element={<NotificationsPage />} />

            <Route path="/rfid-connect" element={<RfidConnect />} />

            <Route path="/readers" element={<ComingSoon title="เพิ่มอุปกรณ์ RFID" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;