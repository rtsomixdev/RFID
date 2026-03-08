import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { HubConnectionBuilder } from '@microsoft/signalr';
import theme from './theme/theme';

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

/**
 * คอมโพเนนต์ซ่อนตัวจัดการและเฝ้าระวังบริการ SignalR เพื่อเชื่อมต่อแบบเรียลไทม์
 * รับหน้าที่ดักฟังอีเวนต์การสแกนผ่าน RFID และกระจายข่าวสู่คอมโพเนนต์อื่น ๆ ในหน้าต่างเดียวกัน
 * * @returns {null} ไม่ส่งคืนหน้ากาก UI ใด ๆ ปรากฏบนหน้าจอ
 */
const SignalRHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ควบคุมการตั้งค่าเพื่อเปิดรอยเชื่อมต่อไปยังเซิร์ฟเวอร์ระบบเวบซ็อกเก็ต
    const connection = new HubConnectionBuilder()
      .withUrl("https://api.rfidtracking.space/hubs/notification", {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log('🟢 SignalR Connected! Waiting for scans...'))
      .catch(err => console.error('🔴 SignalR Connection Error:', err));

    connection.on("OnScan", (data: any) => {
      console.log("⚡ Real-time Scan Received:", data);

      // สื่อสารสัญญาณแจ้งเตือนการสแกนกระจายให้ทุกคอนเท็กซ์ในระดับหน้าต่างเบราว์เซอร์รับรู้
      const event = new CustomEvent("RFID_SCANNED", { detail: data.rfid });
      window.dispatchEvent(event);

      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        // ประเมินและเปลี่ยนทางผู้ใช้ไปยังเมนูที่สัมพันธ์กับชุดโหมดของเครื่องอ่าน RFID แบบอัตโนมัติ
        switch (data.mode) {
          case 'SET_MODE_WASH': navigate('/laundry'); break;
          case 'SET_MODE_DISCARD': navigate('/discard'); break;
          case 'SET_MODE_RESTOCK': navigate('/linens'); break;
          default: break;
        }
      }
    });

    // ✅ เพิ่มการดักฟังสถานะเครื่องอ่าน (Sleep/Wake) และกระจาย Event ให้หน้ารู้
    connection.on("OnModeChanged", (data: any) => {
      console.log("🔄 Real-time Mode Changed:", data);
      const event = new CustomEvent("MODE_CHANGED", { detail: data });
      window.dispatchEvent(event);
    });

    return () => { connection.stop(); };
  }, [navigate]);

  return null;
};

/**
 * หน้าจอแสดงสัญลักษณ์สำหรับการจัดทำหน้าที่ยังไม่เสร็จสมบูรณ์
 * * @param {Object} props - รายละเอียดการแสดงผล
 * @param {string} props.title - ชื่อหัวข้อหน้าที่รอการพัฒนา
 * @returns {JSX.Element} เค้าโครงหน้าจอสร้างระหว่างทาง
 */
const ComingSoon = ({ title }: { title: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
    <h2>🚧 หน้า: {title}</h2><p>กำลังอยู่ในระหว่างการพัฒนา...</p>
  </div>
);

/**
 * คอมโพเนนต์ปิดกั้นและอารักขาเส้นทาง URL ระบบเพื่อตีกรอบสมาธิของผู้ใช้งาน
 * จะตรวจสอบความถูกต้องและใบอนุญาตของบัญชีผู้ใช้เมื่อพยายามร้องขอใช้หน้าต่างๆ
 * * @param {Object} props - องค์ประกอบและค่าติดตั้งสิทธิ์
 * @param {JSX.Element} props.children - โครงสร้างลูกที่จะปกป้องไว้เบื้องหลัง
 * @param {string | string[]} [props.requiredPerm] - สิทธิ์เดี่ยวหรือกลุ่มที่ต้องมีเพื่อก้าวผ่านด่านนี้หากมีอาเรย์แค่จับคู่หนึ่งรายการจะถือว่าผ่าน
 * @returns {JSX.Element} เลเยอร์คอมโพเนนต์ปลายทางหรือสั่งผลักไปหน้าอื่นถ้าไม่มีสิทธิ
 */
const PermissionGuard = ({ children, requiredPerm }: { children: JSX.Element, requiredPerm?: string | string[] }) => {
  const userStr = localStorage.getItem('currentUser');

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  const userPerms: string[] = user.Permissions || user.permissions || [];
  const roleId = user.roleId || user.RoleId || 0;

  // ปลดล็อกเกราะป้องกันขั้นสูงสุดในกรณีเจ้าหน้าที่เป็นผู้ดูแลระบบ (Admin)
  if (roleId === 1) {
    return children;
  }

  // ซักซ้อมประเมินเงื่อนไขชุดสิทธิตามรายละเอียดประเภทหน้าเว็บย่อยที่เรียกร้องมา
  if (requiredPerm) {
    if (Array.isArray(requiredPerm)) {
      const hasAnyPerm = requiredPerm.some(perm => userPerms.includes(perm));
      if (!hasAnyPerm) return <Navigate to="/" replace />;
    } else {
      if (!userPerms.includes(requiredPerm)) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children;
};

/**
 * คอมโพเนนต์เปลือกนอกบรรจุสถาปัตยกรรมโครงข่ายแอปพลิเคชัน
 * ควบคุมเส้นทางเราเตอร์และวาดโครงรอยต่อกับหน้าตาบริบทส่วนรวม
 * * @returns {JSX.Element} เส้นทางกรอบงานครอบคลุมเบราว์เซอร์ราวเตอ
 */
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

            <Route path="/" element={<Home />} />

            <Route path="/dashboard" element={<PermissionGuard requiredPerm={['VIEW_DASHBOARD', 'READ_DASHBOARD']}><Dashboard /></PermissionGuard>} />
            <Route path="/stats" element={<PermissionGuard requiredPerm={['VIEW_DASHBOARD', 'READ_DASHBOARD']}><Dashboard /></PermissionGuard>} />

            <Route path="/hospital" element={<PermissionGuard requiredPerm={['READ_HOSPITAL', 'MANAGE_HOSPITAL']}><Hospital /></PermissionGuard>} />
            <Route path="/vendors" element={<PermissionGuard requiredPerm={['READ_VENDOR', 'MANAGE_VENDOR']}><Vendor /></PermissionGuard>} />
            <Route path="/users" element={<PermissionGuard requiredPerm={['READ_USER', 'MANAGE_USER', 'READ_ROLE']}><Users /></PermissionGuard>} />

            <Route path="/linens" element={<PermissionGuard requiredPerm={['READ_LINEN', 'MANAGE_LINEN']}><Linen /></PermissionGuard>} />
            <Route path="/requests" element={<PermissionGuard requiredPerm={['READ_REQUEST', 'MANAGE_REQUEST']}><Requests /></PermissionGuard>} />

            <Route path="/laundry" element={<PermissionGuard requiredPerm={['READ_LAUNDRY', 'MANAGE_LAUNDRY']}><Laundry /></PermissionGuard>} />
            <Route path="/discard" element={<PermissionGuard requiredPerm={['READ_DISCARD', 'MANAGE_DISCARD']}><Discard /></PermissionGuard>} />

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