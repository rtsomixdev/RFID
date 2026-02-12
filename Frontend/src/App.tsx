import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { HubConnectionBuilder } from '@microsoft/signalr'; // ⚠️ อย่าลืม npm install @microsoft/signalr
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

// ----------------------------------------------------------------------
// 🔥 Component สำหรับจัดการ SignalR (Real-time)
// ต้องวางไว้ใต้ <Router> เสมอ ถึงจะใช้ useNavigate ได้
// ----------------------------------------------------------------------
const SignalRHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. สร้างการเชื่อมต่อ
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5134/hubs/notification", {
        withCredentials: true // ✅ สำคัญมากสำหรับ CORS
      })
      .withAutomaticReconnect()
      .build();

    // 2. เริ่มต้นเชื่อมต่อ
    connection.start()
      .then(() => console.log('🟢 SignalR Connected! Waiting for scans...'))
      .catch(err => console.error('🔴 SignalR Connection Error:', err));

    // 3. 👂 ดักฟัง Event "OnScan" จาก Backend
    connection.on("OnScan", (data: any) => {
      console.log("⚡ Real-time Scan Received:", data);

      // A. ส่ง Event บอกทุกหน้าจอ (เช่น หน้าลงทะเบียน ให้กรอก Textbox เอง)
      const event = new CustomEvent("RFID_SCANNED", { detail: data.rfid });
      window.dispatchEvent(event);

      // B. เปลี่ยนหน้าจออัตโนมัติ (Navigation Logic)
      // เช็คว่า User Login อยู่หรือเปล่าก่อนเปลี่ยนหน้า
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        switch (data.mode) {
          case 'SET_MODE_WASH':
            navigate('/laundry'); // เด้งไปหน้าซักผ้า
            break;
          case 'SET_MODE_DISCARD':
            navigate('/discard'); // เด้งไปหน้าทิ้ง/ชำรุด
            break;
          case 'SET_MODE_RESTOCK':
            navigate('/linens');  // เด้งไปหน้าสต็อก
            break;
          default:
            // Normal Mode: ไม่ต้องเปลี่ยนหน้า หรืออาจจะแค่แจ้งเตือน
            break;
        }
      }
    });

    // Cleanup เมื่อปิด App
    return () => {
      connection.stop();
    };
  }, [navigate]);

  return null; // Component นี้ทำงานเบื้องหลัง ไม่ต้องแสดงผล
};

// ----------------------------------------------------------------------

const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

// 🔥🔥🔥 Permission Guard: ตัวเช็คสิทธิ์การเข้าถึง 🔥🔥🔥
const PermissionGuard = ({ children, requiredPerm }: { children: JSX.Element, requiredPerm?: string }) => {
  const userStr = localStorage.getItem('currentUser');
  
  // 1. ยังไม่ Login -> ดีดไปหน้า Login
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  
  // 2. ถ้าหน้านี้ต้องการสิทธิ์ (requiredPerm) แต่ User ไม่มี -> ดีดไปหน้า Home (หรือ Unauthorized)
  if (requiredPerm) {
    // ดึง permissions จาก user object (รองรับทั้งตัวเล็กตัวใหญ่เผื่อ backend ส่งมาต่างกัน)
    const userPerms: string[] = user.Permissions || user.permissions || [];
    
    // (Optional: ให้ Role 'Admin' เข้าได้ทุกหน้าโดยไม่ต้องเช็ค)
    // if (user.RoleName === 'Admin') return children;

    if (!userPerms.includes(requiredPerm)) {
      // ไม่มีสิทธิ์!
      return <Navigate to="/" replace />; 
    }
  }

  // 3. ผ่านฉลุย
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* ✅ Router ต้องอยู่ชั้นนอกสุด */}
      <Router>
        
        {/* ✅ SignalRHandler อยู่ใน Router เพื่อใช้ useNavigate */}
        <SignalRHandler />

        <Routes>
          {/* 1. Public Pages (หน้า Login แยกต่างหาก ไม่มี Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* 2. Main Layout Structure (มี Sidebar + Navbar) */}
          <Route element={<MainLayout />}>

            {/* 🟢 PUBLIC ACCESS: หน้า Home (Monitor) เข้าได้ทุกคน ไม่ต้อง Login */}
            <Route path="/" element={<Home />} />

            {/* 🔒 PROTECTED AREA: โซนหวงห้าม ต้องมีสิทธิ์เฉพาะทาง */}
            
            {/* กลุ่ม Dashboard */}
            <Route path="/dashboard" element={<PermissionGuard requiredPerm="VIEW_DASHBOARD"><Dashboard /></PermissionGuard>} />
            <Route path="/stats" element={<PermissionGuard requiredPerm="VIEW_DASHBOARD"><Dashboard /></PermissionGuard>} />

            {/* กลุ่มจัดการข้อมูลหลัก */}
            <Route path="/hospital" element={<PermissionGuard requiredPerm="MANAGE_HOSPITAL"><Hospital /></PermissionGuard>} />
            <Route path="/vendors" element={<PermissionGuard requiredPerm="MANAGE_VENDOR"><Vendor /></PermissionGuard>} />
            <Route path="/users" element={<PermissionGuard requiredPerm="MANAGE_USER"><Users /></PermissionGuard>} />
            
            {/* กลุ่มจัดการผ้า (Stock & Requests) */}
            <Route path="/linens" element={<PermissionGuard requiredPerm="MANAGE_LINEN"><Linen /></PermissionGuard>} />
            <Route path="/requests" element={<PermissionGuard requiredPerm="MANAGE_REQUEST"><Requests /></PermissionGuard>} />

            {/* กลุ่ม Laundry Flow */}
            <Route path="/laundry" element={<PermissionGuard requiredPerm="MANAGE_LAUNDRY"><Laundry /></PermissionGuard>} />
            <Route path="/discard" element={<PermissionGuard requiredPerm="MANAGE_DISCARD"><Discard /></PermissionGuard>} />
            
            {/* กลุ่มอื่นๆ */}
            <Route path="/reports" element={<PermissionGuard requiredPerm="VIEW_REPORT"><Reports /></PermissionGuard>} />
            <Route path="/transport" element={<PermissionGuard requiredPerm="MANAGE_TRANSPORT"><Transport /></PermissionGuard>} />
            <Route path="/settings" element={<PermissionGuard requiredPerm="MANAGE_SETTING"><Settings /></PermissionGuard>} />
            
            <Route path="/rfid-connect" element={<PermissionGuard requiredPerm="CONNECT_RFID"><RfidConnect /></PermissionGuard>} />
            
            {/* หน้าแจ้งเตือน (ให้สิทธิ์พื้นฐานเข้าได้ ถ้าล็อกอินแล้ว) */}
            <Route path="/notifications" element={<PermissionGuard><NotificationsPage /></PermissionGuard>} />
            
            <Route path="/readers" element={<PermissionGuard><ComingSoon title="เพิ่มอุปกรณ์ RFID" /></PermissionGuard>} />

          </Route>

          {/* Fallback: ถ้า URL ไม่ตรงกับอะไรเลย ให้กลับไปหน้า Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;