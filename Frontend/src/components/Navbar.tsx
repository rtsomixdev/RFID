import React, { useState, useEffect } from 'react';
import { 
  AppBar, Toolbar, IconButton, Typography, Box, Badge, Stack,
  Menu, MenuItem, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider, Button 
} from '@mui/material';
import { 
  Menu as MenuIcon, Notifications, CheckCircle, Info, Warning 
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axiosClient';

const drawerWidth = 280; 

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
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

  // --- 1. Logic นาฬิกา ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. Logic Notification ---
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
    const interval = setInterval(fetchNotifications, 30000); // Poll ทุก 30 วิ
    return () => clearInterval(interval);
  }, []);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleRead = async (noti: any) => {
    if (!noti.isRead) {
      await axios.post(`/Notification/Read/${noti.id}`);
      fetchNotifications(); 
    }
    handleCloseMenu();
    if (noti.linkUrl) navigate(noti.linkUrl);
  };

  const handleReadAll = async () => {
    if(!user) return;
    await axios.post('/Notification/ReadAll', { userId: user.userId, roleId: user.roleId });
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    if (type === 'SUCCESS') return <CheckCircle sx={{ color: 'success.main' }} />;
    if (type === 'WARNING') return <Warning sx={{ color: 'warning.main' }} />;
    return <Info sx={{ color: 'info.main' }} />;
  };

  // --- 3. Logic ชื่อหน้า (เพิ่มหน้าใหม่เข้าไป) ---
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return 'หน้าหลัก (Monitor)';
      case '/stats': return 'สถิติภาพรวม (Dashboard)';
      case '/requests': return 'รายการคำร้องเบิกผ้า';
      case '/laundry': return 'ระบบซักรีด (Laundry Management)';
      case '/discard': return 'แจ้งผ้าชำรุด / สูญหาย';
      case '/linens': return 'จัดการสต็อกผ้า (Linen Inventory)';
      case '/hospital': return 'ข้อมูลโรงพยาบาล';
      case '/users': return 'จัดการบุคลากร';
      case '/rfid-connect': return 'ตั้งค่าการเชื่อมต่อ RFID';
      case '/vendors': return 'จัดการข้อมูลบริษัทคู่ค้า';
      case '/reports': return 'ระบบออกรายงาน (Reports Center)';
      
      // ✅ เพิ่มหน้าใหม่
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
        bgcolor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(8px)',       
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        color: '#1e293b', 
        borderBottom: '1px solid #f1f5f9'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        
        {/* Left: Menu & Title */}
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

        {/* Right: Clock & Notification */}
        <Stack direction="row" alignItems="center" spacing={2}>
           
           {/* Digital Clock */}
           <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' }, mr: 2 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'monospace', color: '#3b82f6', lineHeight: 1 }}>
                {time.toLocaleTimeString('th-TH')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
           </Box>

           {/* Notification Bell */}
           <IconButton 
              onClick={handleOpenMenu}
              sx={{ bgcolor: '#f1f5f9', '&:hover':{ bgcolor: '#e2e8f0' } }}
           >
              <Badge badgeContent={unreadCount} color="error">
                <Notifications sx={{ color: '#64748b' }} />
              </Badge>
           </IconButton>

           {/* Dropdown Menu */}
           <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  width: 320,
                  maxHeight: 400,
                  borderRadius: 3
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
           >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="subtitle1" fontWeight="bold">การแจ้งเตือน</Typography>
                {unreadCount > 0 && (
                    <Button size="small" onClick={handleReadAll}>อ่านทั้งหมด</Button>
                )}
              </Box>
              
              <List sx={{ p: 0 }}>
                {notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        ไม่มีการแจ้งเตือนใหม่
                    </Box>
                ) : (
                    notifications.map((noti) => (
                    <ListItem 
                        key={noti.id} 
                        button 
                        onClick={() => handleRead(noti)}
                        sx={{ 
                            bgcolor: noti.isRead ? 'transparent' : '#f0f9ff',
                            borderBottom: '1px solid #f8fafc'
                        }}
                    >
                        <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent' }}>
                            {getIcon(noti.type)}
                        </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                        primary={<Typography variant="subtitle2" fontWeight="bold">{noti.title}</Typography>}
                        secondary={
                            <React.Fragment>
                                <Typography component="span" variant="body2" color="text.primary" display="block" noWrap>
                                    {noti.message}
                                </Typography>
                                <Typography component="span" variant="caption" color="text.secondary">
                                    {new Date(noti.createdAt).toLocaleString('th-TH')}
                                </Typography>
                            </React.Fragment>
                        }
                        />
                    </ListItem>
                    ))
                )}
              </List>
              
              <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
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