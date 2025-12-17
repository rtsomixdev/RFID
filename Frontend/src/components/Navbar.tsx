import React from 'react';
import { AppBar, Toolbar, IconButton, Box, Avatar, Badge, Typography } from '@mui/material';
import { Menu as MenuIcon, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC<{ onSidebarOpen: () => void }> = ({ onSidebarOpen }) => {
  const navigate = useNavigate();
  // ดึงข้อมูล User (ถ้ามีรูปให้ใส่ใน src ของ Avatar)
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  return (
    <AppBar 
        position="fixed" 
        sx={{ 
            width: { sm: `calc(100% - 260px)` }, // ขยับหนี Sidebar
            ml: { sm: `260px` },
            bgcolor: 'transparent', // พื้นหลังใส เพื่อให้เห็นสีพื้นหลังหลัก
            boxShadow: 'none',
            color: '#334155', // สีไอคอนเทาเข้ม
            zIndex: (theme) => theme.zIndex.drawer + 1 
        }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onSidebarOpen}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* ชื่อหน้า หรือ Breadcrumb (ว่างไว้ก่อน) */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* ปุ่มแจ้งเตือน */}
            <IconButton color="inherit">
                <Badge badgeContent={4} color="error" variant="dot">
                    <NotificationsNone />
                </Badge>
            </IconButton>

            {/* รูปโปรไฟล์ */}
            <Box 
                onClick={handleLogout} 
                sx={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <Avatar 
                    alt={user.firstName} 
                    src="/static/images/avatar/1.jpg" // ใส่ URL รูปจริงถ้ามี
                    sx={{ width: 40, height: 40, border: '2px solid #fff', boxShadow: 1 }} 
                />
            </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;