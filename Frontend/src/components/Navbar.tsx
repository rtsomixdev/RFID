import React, { useState, useEffect } from 'react';
import { 
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Stack 
} from '@mui/material';
import { 
  Menu as MenuIcon, Notifications
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';

const drawerWidth = 280; // ต้องตรงกับใน Sidebar.tsx

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  // นาฬิกาเดินจริง
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ฟังก์ชันแปลง Path เป็นชื่อหน้าภาษาไทย
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'หน้าหลัก (Monitor)';
      case '/stats': return 'สถิติภาพรวม (Dashboard)';
      case '/requests': return 'รายการคำร้องเบิกผ้า';
      case '/laundry': return 'ระบบซักรีด (Laundry Management)'; // ✅ เพิ่มเคสนี้
      case '/discard': return 'แจ้งผ้าชำรุด / สูญหาย';
      case '/linens': return 'จัดการสต็อกผ้า (Linen Inventory)';
      case '/hospital': return 'ข้อมูลโรงพยาบาล';
      case '/users': return 'จัดการบุคลากร';
      case '/rfid-connect': return 'ตั้งค่าการเชื่อมต่อ RFID';
      case '/vendors': return 'จัดการข้อมูลบริษัทคู่ค้า';
      default: return 'Smart RFID System';
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        bgcolor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(8px)',       
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        color: '#1e293b', 
        borderBottom: '1px solid #f1f5f9'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        
        {/* 1. ฝั่งซ้าย: ปุ่มเมนู (Mobile) + ชื่อหน้า */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#64748b' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box>
             <Typography variant="h6" fontWeight="bold" sx={{ color: '#0f172a' }}>
               {getPageTitle(location.pathname)}
             </Typography>
          </Box>
        </Box>

        {/* 2. ฝั่งขวา: นาฬิกา + แจ้งเตือน */}
        <Stack direction="row" alignItems="center" spacing={2}>
           
           {/* นาฬิกาดิจิทัล */}
           <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' }, mr: 2 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace', color: '#3b82f6', lineHeight: 1 }}>
                {time.toLocaleTimeString('th-TH')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
           </Box>

           {/* ปุ่มแจ้งเตือน (Low Stock Alert Placeholder) */}
           <IconButton sx={{ bgcolor: '#f1f5f9', '&:hover':{ bgcolor: '#e2e8f0' } }}>
              <Badge badgeContent={3} color="error">
                <Notifications sx={{ color: '#64748b' }} />
              </Badge>
           </IconButton>

        </Stack>

      </Toolbar>
    </AppBar>
  );
};

export default Navbar;