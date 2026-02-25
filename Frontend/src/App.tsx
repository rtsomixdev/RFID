import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { HubConnectionBuilder } from '@microsoft/signalr'; 
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
import SearchLinen from './pages/SearchLinen'; 

import MainLayout from './layouts/MainLayout';

// ----------------------------------------------------------------------
// 🔥 Component สำหรับจัดการ SignalR (Real-time)
// ----------------------------------------------------------------------
const SignalRHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5134/hubs/notification", {
        withCredentials: true 
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log('🟢 SignalR Connected! Waiting for scans...'))
      .catch(err => console.error('🔴 SignalR Connection Error:', err));

    connection.on("OnScan", (data: any) => {
      console.log("⚡ Real-time Scan Received:", data);
      const event = new CustomEvent("RFID_SCANNED", { detail: data.rfid });
      window.dispatchEvent(event);

      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        switch (data.mode) {
          case 'SET_MODE_WASH': navigate('/laundry'); break;
          case 'SET_MODE_DISCARD': navigate('/discard'); break;
          case 'SET_MODE_RESTOCK': navigate('/linens');  break;
          default: break;
        }
      }
    });

    return () => { connection.stop(); };
  }, [navigate]);

  return null; 
};

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

// 🔥🔥🔥 ปรับปรุง Permission Guard ใหม่ให้ฉลาดขึ้น 🔥🔥🔥
const PermissionGuard = ({ children, requiredPerm }: { children: JSX.Element, requiredPerm?: string | string[] }) => {
  const userStr = localStorage.getItem('currentUser');
  
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  const userPerms: string[] = user.Permissions || user.permissions || [];
  const roleId = user.roleId || user.RoleId || 0;

  // ✅ 1. ถ้าเป็น Admin (RoleId = 1) ปล่อยผ่านให้เข้าได้ทุกหน้า 100%
  if (roleId === 1) {
    return children;
  }
  
  // ✅ 2. ถ้ามีการระบุสิทธิ์ที่ต้องการ 
  if (requiredPerm) {
    if (Array.isArray(requiredPerm)) {
      // ถ้าระบุมาเป็น Array: ขอแค่มีสิทธิ์ใดสิทธิ์หนึ่งใน Array นี้ ก็ให้ผ่าน (เช่น มีแค่ READ ก็ดูหน้าเว็บได้)
      const hasAnyPerm = requiredPerm.some(perm => userPerms.includes(perm));
      if (!hasAnyPerm) return <Navigate to="/" replace />; 
    } else {
      // ถ้าระบุมาเป็น String คำเดียว: ต้องมีคำนี้เป๊ะๆ ถึงจะผ่าน
      if (!userPerms.includes(requiredPerm)) {
        return <Navigate to="/" replace />; 
      }
    }
  }

  // 3. ผ่านฉลุย
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <Router>
        <SignalRHandler />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<MainLayout />}>

            {/* 🟢 PUBLIC ACCESS: หน้า Home (Monitor) */}
            <Route path="/" element={<Home />} />

            {/* 🔒 PROTECTED AREA: ใช้ Array ในการเช็คสิทธิ์ (แค่มีสิทธิ์ READ หรือ MANAGE อย่างใดอย่างหนึ่งก็เข้าหน้าเว็บได้) */}
            
            <Route path="/dashboard" element={<PermissionGuard requiredPerm={['VIEW_DASHBOARD', 'READ_DASHBOARD']}><Dashboard /></PermissionGuard>} />
            <Route path="/stats" element={<PermissionGuard requiredPerm={['VIEW_DASHBOARD', 'READ_DASHBOARD']}><Dashboard /></PermissionGuard>} />

            <Route path="/hospital" element={<PermissionGuard requiredPerm={['READ_HOSPITAL', 'MANAGE_HOSPITAL']}><Hospital /></PermissionGuard>} />
            <Route path="/vendors" element={<PermissionGuard requiredPerm={['READ_VENDOR', 'MANAGE_VENDOR']}><Vendor /></PermissionGuard>} />
            <Route path="/users" element={<PermissionGuard requiredPerm={['READ_USER', 'MANAGE_USER', 'READ_ROLE']}><Users /></PermissionGuard>} />
            
            <Route path="/linens" element={<PermissionGuard requiredPerm={['READ_LINEN', 'MANAGE_LINEN']}><Linen /></PermissionGuard>} />
            <Route path="/requests" element={<PermissionGuard requiredPerm={['READ_REQUEST', 'MANAGE_REQUEST']}><Requests /></PermissionGuard>} />

            <Route path="/laundry" element={<PermissionGuard requiredPerm={['READ_LAUNDRY', 'MANAGE_LAUNDRY']}><Laundry /></PermissionGuard>} />
            <Route path="/discard" element={<PermissionGuard requiredPerm={['READ_DISCARD', 'MANAGE_DISCARD']}><Discard /></PermissionGuard>} />
            
            {/* กลุ่มนี้อนุญาตให้ทุกคนที่ล็อกอินแล้วเข้าได้เลย โดยไม่ต้องระบุ RequiredPerm */}
            <Route path="/search-linen" element={<PermissionGuard><SearchLinen /></PermissionGuard>} />
            <Route path="/notifications" element={<PermissionGuard><NotificationsPage /></PermissionGuard>} />

            <Route path="/reports" element={<PermissionGuard requiredPerm={['VIEW_REPORT', 'READ_REPORT']}><Reports /></PermissionGuard>} />
            <Route path="/transport" element={<PermissionGuard requiredPerm={['READ_TRANSPORT', 'MANAGE_TRANSPORT']}><Transport /></PermissionGuard>} />
            <Route path="/settings" element={<PermissionGuard requiredPerm="MANAGE_SETTING"><Settings /></PermissionGuard>} />
            
            <Route path="/rfid-connect" element={<PermissionGuard requiredPerm={['READ_RFID', 'CONNECT_RFID', 'WRITE_RFID']}><RfidConnect /></PermissionGuard>} />
            <Route path="/readers" element={<PermissionGuard><ComingSoon title="เพิ่มอุปกรณ์ RFID" /></PermissionGuard>} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;