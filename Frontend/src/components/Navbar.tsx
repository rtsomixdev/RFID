import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Stack,
  Menu, Button, MenuItem, Avatar, ListItemButton, ListItemAvatar, ListItemText
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, CheckCircle, Info, Warning, Error as ErrorIcon, AccessTime
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axiosClient';

const drawerWidth = 280;

interface NavbarProps {
  onMenuClick: () => void;
  // Support either prop name just in case
  onSidebarOpen?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onSidebarOpen }) => {
  // Handle both prop names for compatibility during refactor
  const handleToggle = onMenuClick || onSidebarOpen;

  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  // State สำหรับ Notification
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ดึง User ปัจจุบัน
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Logic Notification ---
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/Notification/MyNotifications?userId=${user.userId}&roleId=${user.roleId}`);
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleRead = async (noti: any) => {
    handleCloseMenu();
    if (!noti.isRead) {
      try {
        await axios.post(`/Notification/Read/${noti.id}`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, isRead: true } : n));
      } catch (err) { console.error(err); }
    }
    if (noti.linkUrl) navigate(noti.linkUrl);
  };

  const handleReadAll = async () => {
    if (!user) return;
    try {
      await axios.post('/Notification/ReadAll', { userId: user.userId, roleId: user.roleId });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'SUCCESS': return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'WARNING': return <Warning sx={{ color: 'warning.main' }} />;
      case 'DANGER':
      case 'ERROR': return <ErrorIcon sx={{ color: 'error.main' }} />;
      default: return <Info sx={{ color: 'info.main' }} />;
    }
  };

  const getPageTitle = (path: string) => {
    const basePath = path.split('?')[0];
    if (basePath.startsWith('/requests')) return 'รายการคำร้องเบิกผ้า';
    switch (basePath) {
      case '/': return 'หน้าหลัก (Monitor)';
      case '/stats': return 'สถิติภาพรวม (Dashboard)';
      case '/laundry': return 'ระบบซักรีด (Laundry Management)';
      case '/discard': return 'แจ้งผ้าชำรุด / สูญหาย';
      case '/linens': return 'จัดการสต็อกผ้า (Linen Inventory)';
      case '/hospital': return 'ข้อมูลโรงพยาบาล';
      case '/users': return 'จัดการบุคลากร';
      case '/rfid-connect': return 'ตั้งค่าการเชื่อมต่อ RFID';
      case '/vendors': return 'จัดการข้อมูลบริษัทคู่ค้า';
      case '/reports': return 'ระบบออกรายงาน (Reports Center)';
      case '/transport': return 'ระบบขนส่ง (Transport Logistics)';
      case '/settings': return 'ตั้งค่าระบบ (System Configuration)';
      case '/notifications': return 'ประวัติการแจ้งเตือน';
      default: return 'Smart RFID System';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        bgcolor: 'rgba(255, 255, 255, 0.8)', // Glassmorphism
        backdropFilter: 'blur(12px)',
        boxShadow: 'none', // Remove shadow
        borderBottom: '1px solid rgba(241, 245, 249, 0.8)', // Subtle border
        color: '#1e293b',
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#64748b' }}
          >
            <MenuIcon />
          </IconButton>

          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ color: '#0f172a', letterSpacing: -0.5 }}>
              {getPageTitle(location.pathname)}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" alignItems="center" spacing={2}>

          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' }, mr: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: '"Inter", monospace', color: '#4f46e5', lineHeight: 1 }}>
              {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
              {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>

          <IconButton
            onClick={handleOpenMenu}
            sx={{
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              '&:hover': { bgcolor: '#e2e8f0' }
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications sx={{ color: '#64748b' }} />
            </Badge>
          </IconButton>

          {/* ✅ Menu (โครงสร้างใหม่) */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'hidden',
                filter: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.1))',
                mt: 1.5,
                width: 360,
                borderRadius: 3,
                border: '1px solid #f1f5f9'
              },
            }}
            // ใช้ padding 0 เพื่อให้เราจัด Layout เอง
            MenuListProps={{ style: { padding: 0 } }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {/* 1. ส่วนหัว (Header) - ติดอยู่ด้านบนเสมอ */}
            <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">การแจ้งเตือน</Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={handleReadAll} sx={{ fontSize: '0.8rem' }}>อ่านทั้งหมด</Button>
              )}
            </Box>

            {/* 2. ส่วนรายการ (Content List) - กำหนด MaxHeight และ Scroll ที่นี่ */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  ไม่มีการแจ้งเตือนใหม่
                </Box>
              ) : (
                notifications.map((noti) => (
                  <ListItemButton
                    key={noti.id}
                    onClick={() => handleRead(noti)}
                    sx={{
                      bgcolor: noti.isRead ? 'transparent' : '#f8fafc',
                      borderBottom: '1px solid #f8fafc',
                      alignItems: 'flex-start',
                      py: 1.5
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                      <Avatar sx={{ bgcolor: 'transparent', width: 32, height: 32 }}>
                        {getIcon(noti.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2, mb: 0.5, color: '#1e293b' }}>
                          {noti.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            fontSize: '0.85rem'
                          }}>
                            {noti.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime fontSize="inherit" />
                            {new Date(noti.createdAt).toLocaleString('th-TH')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))
              )}
            </Box>

            {/* 3. ส่วนท้าย (Footer) - ติดอยู่ด้านล่างเสมอ */}
            <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid #f1f5f9', bgcolor: '#fff' }}>
              <Button fullWidth onClick={() => { handleCloseMenu(); navigate('/notifications'); }}>
                ดูประวัติทั้งหมด
              </Button>
            </Box>
          </Menu>

        </Stack>

      </Toolbar>
    </AppBar>
  );
};

export default Navbar;