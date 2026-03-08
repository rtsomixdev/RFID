import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Stack,
  Menu, Button, MenuItem, Avatar, ListItemButton, ListItemAvatar, ListItemText, Divider
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, CheckCircle, Info, Warning, Error as ErrorIcon, AccessTime
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import axios from '../api/axiosClient';

const drawerWidth = 280;

/**
 * โครงสร้างคุณสมบัติของแถบนำทางส่วนหัว
 * @interface NavbarProps
 * @property {function} onMenuClick เหตุการณ์เมื่อกดปุ่มเมนู (บนจอมือถือ)
 * @property {function} [onSidebarOpen] เหตุการณ์เสริมสำหรับเปิดเมนูด้านข้าง
 */
interface NavbarProps {
  onMenuClick: () => void;
  onSidebarOpen?: () => void;
}

/**
 * คอมโพเนนต์แถบเมนูด้านบน (Navbar) ทำหน้าที่แสดงชื่อหน้าเว็บ ป้ายเวลา 
 * และระบบแจ้งเตือน (Notifications) ดึงข้อมูลแบบเรียลไทม์
 * 
 * @param {NavbarProps} props ฟังก์ชันควบคุมเมนูด้านข้าง
 * @returns {JSX.Element} เลย์เอาต์แถบนำทาง
 */
const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onSidebarOpen }) => {
  const handleToggle = onMenuClick || onSidebarOpen;
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      case 'SUCCESS': return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'WARNING': return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'DANGER':
      case 'ERROR': return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default: return <Info sx={{ color: theme.palette.info.main }} />;
    }
  };

  const getPageTitle = (path: string) => {
    const basePath = path.split('?')[0];
    if (basePath.startsWith('/requests')) return 'รายการคำร้องเบิกผ้า';
    switch (basePath) {
      case '/': return 'หน้าหลัก';
      case '/stats': return 'สถิติภาพรวม';
      case '/laundry': return 'ระบบติดตามสถานะซัก';
      case '/discard': return 'ระบบแจ้งจำหน่ายออก';
      case '/linens': return 'ระบบลงทะเบียนผ้าใหม่';
      case '/hospital': return 'ข้อมูลโรงพยาบาล';
      case '/users': return 'จัดการบุคลากร';
      case '/rfid-connect': return 'ตั้งค่าการเชื่อมต่อ RFID';
      case '/vendors': return 'จัดการข้อมูลบริษัทคู่ค้า';
      case '/reports': return 'ระบบออกรายงาน';
      case '/transport': return 'ระบบติดตามการขนส่งผ้า';
      case '/settings': return 'ตั้งค่าระบบ';
      case '/notifications': return 'ประวัติการแจ้งเตือน';
      default: return 'ระบบติดตามผ้าในโรงพยาบาล';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        bgcolor: alpha('#ffffff', 0.8),
        backdropFilter: 'blur(12px)',
        boxShadow: 'none',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: theme.palette.text.secondary }}
          >
            <MenuIcon />
          </IconButton>

          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ color: theme.palette.text.primary, letterSpacing: -0.5 }}>
              {getPageTitle(location.pathname)}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" alignItems="center" spacing={2.5}>

          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="h6" sx={{ fontFamily: '"Inter", monospace', color: theme.palette.primary.main, lineHeight: 1, fontWeight: 700 }}>
              {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', borderColor: theme.palette.divider }} />

          <IconButton
            onClick={handleOpenMenu}
            sx={{
              bgcolor: alpha(theme.palette.background.default, 0.8),
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': { bgcolor: theme.palette.background.default }
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications sx={{ color: theme.palette.text.secondary }} />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'hidden',
                filter: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.1))',
                mt: 2,
                width: 380,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`
              },
            }}
            MenuListProps={{ style: { padding: 0 } }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="700">การแจ้งเตือน</Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={handleReadAll} sx={{ fontSize: '0.8rem', fontWeight: 600 }}>อ่านทั้งหมด</Button>
              )}
            </Box>

            {/* Content */}
            <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center', color: theme.palette.text.secondary }}>
                  <Typography variant="body2">ไม่มีการแจ้งเตือนใหม่</Typography>
                </Box>
              ) : (
                notifications.map((noti) => (
                  <ListItemButton
                    key={noti.id}
                    onClick={() => handleRead(noti)}
                    sx={{
                      bgcolor: noti.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      alignItems: 'flex-start',
                      py: 2,
                      px: 2.5,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 48, mt: 0.5 }}>
                      <Avatar sx={{ bgcolor: 'transparent', width: 36, height: 36, border: '1px solid #e2e8f0' }}>
                        {getIcon(noti.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight="700" sx={{ lineHeight: 1.3, mb: 0.5, color: theme.palette.text.primary }}>
                          {noti.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{
                            color: theme.palette.text.secondary,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            fontSize: '0.875rem'
                          }}>
                            {noti.message}
                          </Typography>
                          <Typography variant="caption" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: theme.palette.text.disabled, fontWeight: 500 }}>
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

            {/* Footer */}
            <Box sx={{ p: 1.5, textAlign: 'center', borderTop: `1px solid ${theme.palette.divider}`, bgcolor: '#ffffff' }}>
              <Button fullWidth onClick={() => { handleCloseMenu(); navigate('/notifications'); }} sx={{ fontWeight: 600 }}>
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