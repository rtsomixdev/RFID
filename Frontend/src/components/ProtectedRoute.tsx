import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * คุณสมบัติข้อมูลกั้นสิทธิ์สำหรับเส้นทางที่จำกัดพฤติกรรม
 * @interface ProtectedRouteProps
 * @property {string} [requiredPermission] สิทธิ์เจาะจงที่บังคับให้ตั๋วผู้ใช้ต้องมีถึงจะผ่านหน้านี้ได้
 */
interface ProtectedRouteProps {
  requiredPermission?: string;
}

/**
 * คอมโพเนนต์ครอบเส้นทางที่ใช้ดักจับและปกป้องการเข้าถึงจากผู้ใช้ที่ไม่มีสิทธิ์
 * จะตรวจสอบเซสชั่นปัจจุบันและการกระจายสิทธิ์ (Permissions List) เพื่อเปิดทางผ่าน
 * 
 * @param {ProtectedRouteProps} props ข้อมูลคุณสมบัติความปลอดภัยและสิทธิ์ที่ต้องการ
 * @returns {JSX.Element} สั่งเรนเดอร์เนื้อหาย่อยข้างใน หรือส่งคำสั่งนำทางกลับไปหน้าอื่น
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  // ป้องกันผู้ใช้ทั่วไปภายนอก หากตรวจสอบไม่พบเซสชั่นที่เซฟไว้จะสกัดและดีดออก
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const userPermissions: string[] = user.Permissions || user.permissions || [];

    // ตัดสิทธิ์ไม่อนุญาตให้เปิดหน้าและดีดไปหน้า 403 (unauthorized) ถ้าไม่มีสิทธิ์ตามเงื่อนไข
    if (!userPermissions.includes(requiredPermission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;