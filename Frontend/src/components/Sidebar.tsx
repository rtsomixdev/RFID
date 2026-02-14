import React, { useState } from 'react';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Box, Collapse, Typography, Avatar, IconButton, Stack, Divider, Tooltip
} from '@mui/material';
import {
  Home, ShowChart, EditNote, ExpandLess, ExpandMore,
  Assignment, Settings, Sensors,
  DeleteForever, Logout, ChevronRight, LocalLaundryService,
  Summarize, LocalShipping, Apartment, Inventory, Business, People,
  WifiTethering
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { alpha, useTheme } from '@mui/material/styles';

const drawerWidth = 280;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDataEntry, setOpenDataEntry] = useState(true);

  // --- 1. User & Permissions ---
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { firstName: 'Guest', lastName: '', roleId: 0, permissions: [] };

  const userPermissions = new Set(user.permissions || []);
  const roleId = user.roleId || 0;
  const hasPermission = (requiredPerm: string) => {
    if (roleId === 1) return true;
    return userPermissions.has(requiredPerm);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 600) onClose();
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.text.secondary,
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-xl', // Helper utility logic if available, otherwise just nice to have
      }
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    });
  };

  const isSelected = (path: string) => location.pathname === path;

  // --- Modern Menu Styles ---
  const menuButtonStyle = (path: string) => {
    const active = isSelected(path);
    return {
      mb: 0.5,
      mx: 2,
      borderRadius: '10px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      color: active ? theme.palette.primary.main : theme.palette.text.secondary,
      backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
      fontWeight: active ? 600 : 500,
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        backgroundColor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.text.primary, 0.04),
        color: active ? theme.palette.primary.dark : theme.palette.text.primary,
        transform: 'translateX(4px)',
      },
      '&::before': active ? {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: '60%',
        width: '4px',
        backgroundColor: theme.palette.primary.main,
        borderRadius: '0 4px 4px 0',
      } : {},
      '& .MuiListItemIcon-root': {
        color: active ? theme.palette.primary.main : theme.palette.text.disabled,
        minWidth: 36,
        transition: 'color 0.2s',
      }
    };
  };

  const subMenuButtonStyle = (path: string) => {
    const active = isSelected(path);
    return {
      pl: '52px', // Align with text of parent
      py: 1,
      mx: 2,
      mt: 0.2, // Tighter spacing
      borderRadius: '8px',
      color: active ? theme.palette.primary.main : theme.palette.text.secondary,
      bgcolor: active ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
      '&:hover': {
        bgcolor: alpha(theme.palette.text.primary, 0.04),
        color: theme.palette.text.primary,
      },
      '& .MuiTypography-root': {
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
      }
    };
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Typography
      variant="caption"
      sx={{
        px: 3,
        mt: 3,
        mb: 1,
        display: 'block',
        color: theme.palette.text.disabled,
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: 0.8,
        textTransform: 'uppercase'
      }}
    >
      {title}
    </Typography>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff', borderRight: `1px solid ${theme.palette.divider}` }}>

      {/* 1. Logo Section */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 3, py: 4, minHeight: 80 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2,
            boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.4)}`
          }}
        >
          <Sensors sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: theme.palette.text.primary, letterSpacing: -0.5 }}>
            Smart RFID
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500, fontSize: '0.75rem' }}>
            Linen Management
          </Typography>
        </Box>
      </Toolbar>

      <Divider sx={{ mx: 3, mb: 1, borderStyle: 'dashed' }} />

      {/* 2. Menu List */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1, px: 0 }}>
        <List component="nav">

          <SectionHeader title="Overview" />

          {hasPermission('VIEW_DASHBOARD') && (
            <ListItemButton sx={menuButtonStyle('/')} onClick={() => handleNavigate('/')}>
              <ListItemIcon><Home fontSize="small" /></ListItemIcon>
              <ListItemText primary="หน้าหลัก (Monitor)" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {hasPermission('VIEW_DASHBOARD') && (
            <ListItemButton sx={menuButtonStyle('/stats')} onClick={() => handleNavigate('/stats')}>
              <ListItemIcon><ShowChart fontSize="small" /></ListItemIcon>
              <ListItemText primary="สถิติ (Dashboard)" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          <SectionHeader title="Operations" />

          {/* ใช้ MANAGE_REQUEST สำหรับเมนูเบิกผ้า */}
          {hasPermission('MANAGE_REQUEST') && (
            <ListItemButton sx={menuButtonStyle('/requests')} onClick={() => handleNavigate('/requests')}>
              <ListItemIcon><Assignment fontSize="small" /></ListItemIcon>
              <ListItemText primary="คำร้องเบิกผ้า" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {hasPermission('MANAGE_TRANSPORT') && (
            <ListItemButton sx={menuButtonStyle('/transport')} onClick={() => handleNavigate('/transport')}>
              <ListItemIcon><LocalShipping fontSize="small" /></ListItemIcon>
              <ListItemText primary="ระบบขนส่ง" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {hasPermission('MANAGE_LAUNDRY') && (
            <ListItemButton sx={menuButtonStyle('/laundry')} onClick={() => handleNavigate('/laundry')}>
              <ListItemIcon><LocalLaundryService fontSize="small" /></ListItemIcon>
              <ListItemText primary="ระบบซักรีด" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {hasPermission('MANAGE_DISCARD') && (
            <ListItemButton sx={menuButtonStyle('/discard')} onClick={() => handleNavigate('/discard')}>
              <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon>
              <ListItemText primary="แจ้งชำรุด/หาย" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {hasPermission('VIEW_REPORT') && (
            <ListItemButton sx={menuButtonStyle('/reports')} onClick={() => handleNavigate('/reports')}>
              <ListItemIcon><Summarize fontSize="small" /></ListItemIcon>
              <ListItemText primary="รายงาน" primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          )}

          {/* Admin Section */}
          {(hasPermission('MANAGE_HOSPITAL') || hasPermission('MANAGE_LINEN') || hasPermission('MANAGE_USER') || hasPermission('CONNECT_RFID')) && (
            <>
              <SectionHeader title="Management" />

              <ListItemButton onClick={() => setOpenDataEntry(!openDataEntry)} sx={{ ...menuButtonStyle(''), justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
                  <ListItemText primary="จัดการข้อมูล" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </Box>
                {openDataEntry ? <ExpandLess fontSize="small" sx={{ color: theme.palette.text.disabled }} /> : <ChevronRight fontSize="small" sx={{ color: theme.palette.text.disabled }} />}
              </ListItemButton>

              <Collapse in={openDataEntry} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>

                  {hasPermission('MANAGE_HOSPITAL') && (
                    <ListItemButton sx={subMenuButtonStyle('/hospital')} onClick={() => handleNavigate('/hospital')}>
                      {/* Optional: Add icon for clear hierarchy */}
                      {/* <ListItemIcon sx={{ minWidth: 24, transform: 'scale(0.8)' }}><Apartment /></ListItemIcon> */}
                      <ListItemText primary="โรงพยาบาล" />
                    </ListItemButton>
                  )}

                  {hasPermission('MANAGE_LINEN') && (
                    <ListItemButton sx={subMenuButtonStyle('/linens')} onClick={() => handleNavigate('/linens')}>
                      <ListItemText primary="สต็อกผ้า (Linen)" />
                    </ListItemButton>
                  )}

                  {hasPermission('MANAGE_VENDOR') && (
                    <ListItemButton sx={subMenuButtonStyle('/vendors')} onClick={() => handleNavigate('/vendors')}>
                      <ListItemText primary="บริษัทคู่ค้า" />
                    </ListItemButton>
                  )}

                  {hasPermission('MANAGE_USER') && (
                    <ListItemButton sx={subMenuButtonStyle('/users')} onClick={() => handleNavigate('/users')}>
                      <ListItemText primary="บุคลากร (Users)" />
                    </ListItemButton>
                  )}

                  {hasPermission('CONNECT_RFID') && (
                    <ListItemButton sx={subMenuButtonStyle('/rfid-connect')} onClick={() => handleNavigate('/rfid-connect')}>
                      <ListItemText primary="เชื่อมต่อ RFID" />
                    </ListItemButton>
                  )}

                </List>
              </Collapse>
            </>
          )}

        </List>
      </Box>

      {/* 3. Footer / User Profile User */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
        {hasPermission('MANAGE_SETTING') && (
          <ListItemButton sx={{ ...menuButtonStyle('/settings'), mx: 0, mb: 2 }} onClick={() => handleNavigate('/settings')}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText primary="ตั้งค่าระบบ" primaryTypographyProps={{ fontSize: '0.9rem' }} />
          </ListItemButton>
        )}

        <Box sx={{
          bgcolor: '#ffffff',
          borderRadius: 3,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              color: '#fff',
              width: 40, height: 40,
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.25)}`
            }}
          >
            {user.firstName?.charAt(0)}
          </Avatar>
          <Box sx={{ ml: 1.5, flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.9rem' }}>
              {user.firstName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
              {roleId === 1 ? 'Administrator' : (roleId === 2 ? 'Sub-Admin' : 'Staff')}
            </Typography>
          </Box>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} sx={{ color: theme.palette.error.main, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 }, zIndex: (theme) => theme.zIndex.drawer + 2 }}>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' }
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;