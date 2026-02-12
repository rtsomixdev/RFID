import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  requiredPermission?: string; // สิทธิ์ที่ต้องมี (เช่น 'MANAGE_USER')
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  // 1. ดึง User จาก LocalStorage (หรือ Context)
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  // 2. ถ้าไม่ได้ Login -> ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. ถ้าหน้านี้ต้องการสิทธิ์พิเศษ แต่ User ไม่มี -> ดีดไปหน้า 403 หรือ Dashboard
  if (requiredPermission) {
    // สมมติว่าตอน Login เราส่ง array permissions มาใน user.permissions หรือ user.Permissions
    const userPermissions: string[] = user.Permissions || user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      // ไม่มีสิทธิ์!
      return <Navigate to="/unauthorized" replace />; // หรือ redirect ไป "/"
    }
  }

  // 4. ผ่านฉลุย -> ให้เข้าหน้าได้
  return <Outlet />;
};

export default ProtectedRoute;