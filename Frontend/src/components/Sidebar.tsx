import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Box, Collapse, Typography, Avatar, IconButton, Divider
} from '@mui/material';
import {
  Home, ShowChart, EditNote, ExpandLess, ExpandMore,
  Assignment, Settings, Sensors,
  DeleteForever, Logout, ChevronRight, LocalLaundryService,
  Summarize, LocalShipping
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const drawerWidth = 280;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDataEntry, setOpenDataEntry] = useState(true);

  // User Data
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : { firstName: 'Guest', lastName: '', roleId: 0 };
  const roleId = user.roleId || 0;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 600) onClose();
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    });
  };

  const isSelected = (path: string) => location.pathname === path;

  // --- New Theme Styles ---
  const sidebarBg = '#ffffff'; // Clean White
  const textPrimary = '#1e293b'; // Slate-800
  const textSecondary = '#64748b'; // Slate-500
  const activeColor = '#4f46e5'; // Indigo-600
  const activeBg = '#eef2ff'; // Indigo-50

  const menuButtonStyle = (path: string) => ({
    mb: 0.5,
    mx: 2,
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    color: isSelected(path) ? activeColor : textPrimary,
    backgroundColor: isSelected(path) ? activeBg : 'transparent',
    fontWeight: isSelected(path) ? 600 : 500,
    '&:hover': {
      backgroundColor: isSelected(path) ? activeBg : '#f1f5f9', // Slate-100 on hover
      color: activeColor,
    },
    '& .MuiListItemIcon-root': {
      color: isSelected(path) ? activeColor : '#94a3b8', // Slate-400 inactive icon
      minWidth: 35,
      transition: 'color 0.2s'
    }
  });

  const subMenuButtonStyle = (path: string) => ({
    pl: 4,
    py: 1,
    mx: 2,
    mt: 0.5,
    borderRadius: '8px',
    color: isSelected(path) ? activeColor : textSecondary,
    bgcolor: isSelected(path) ? '#f8fafc' : 'transparent',
    '&:hover': {
      bgcolor: '#f1f5f9',
      color: activeColor
    },
    '& .MuiTypography-root': {
      fontSize: '0.9rem',
      fontWeight: isSelected(path) ? 600 : 400
    }
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: sidebarBg, color: textPrimary, borderRight: '1px solid #f1f5f9' }}>

      {/* 1. Logo Section */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 3, py: 4, mb: 1 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: `linear-gradient(135deg, ${activeColor} 0%, #6366f1 100%)`,
            display: 'flex',
            alignItems: 'center', justifyContent: 'center', mr: 2,
            boxShadow: '0 4px 12px -2px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Sensors sx={{ color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1, letterSpacing: -0.5, color: '#0f172a' }}>
            Smart RFID
          </Typography>
          <Typography variant="caption" sx={{ color: textSecondary, fontWeight: 500 }}>
            Linen Management
          </Typography>
        </Box>
      </Toolbar>

      {/* 2. Menu List */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1, px: 0 }}>
        <List component="nav">

          <Typography variant="caption" sx={{ px: 3, mb: 1, display: 'block', color: '#94a3b8', fontWeight: '700', fontSize: '0.75rem', letterSpacing: 0.5 }}>
            MAIN MENU
          </Typography>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/')} onClick={() => handleNavigate('/')}>
              <ListItemIcon><Home fontSize="small" /></ListItemIcon>
              <ListItemText primary="หน้าหลัก (Monitor)" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/stats')} onClick={() => handleNavigate('/stats')}>
              <ListItemIcon><ShowChart fontSize="small" /></ListItemIcon>
              <ListItemText primary="สถิติ (Dashboard)" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/requests')} onClick={() => handleNavigate('/requests')}>
              <ListItemIcon><Assignment fontSize="small" /></ListItemIcon>
              <ListItemText primary="คำร้องเบิกผ้า" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/transport')} onClick={() => handleNavigate('/transport')}>
              <ListItemIcon><LocalShipping fontSize="small" /></ListItemIcon>
              <ListItemText primary="ระบบขนส่ง" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/laundry')} onClick={() => handleNavigate('/laundry')}>
              <ListItemIcon><LocalLaundryService fontSize="small" /></ListItemIcon>
              <ListItemText primary="ระบบซักรีด" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/discard')} onClick={() => handleNavigate('/discard')}>
              <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon>
              <ListItemText primary="แจ้งชำรุด/หาย" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/reports')} onClick={() => handleNavigate('/reports')}>
              <ListItemIcon><Summarize fontSize="small" /></ListItemIcon>
              <ListItemText primary="รายงาน" primaryTypographyProps={{ fontSize: '0.95rem' }} />
            </ListItemButton>
          </ListItem>

          {/* Admin Section */}
          {(roleId === 1 || roleId === 2) && (
            <>
              <Typography variant="caption" sx={{ px: 3, mt: 3, mb: 1, display: 'block', color: '#94a3b8', fontWeight: '700', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                MANAGEMENT
              </Typography>

              <ListItemButton onClick={() => setOpenDataEntry(!openDataEntry)} sx={{ ...menuButtonStyle(''), justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
                  <ListItemText primary="จัดการข้อมูล" primaryTypographyProps={{ fontSize: '0.95rem' }} />
                </Box>
                {openDataEntry ? <ExpandLess fontSize="small" sx={{ color: '#94a3b8' }} /> : <ChevronRight fontSize="small" sx={{ color: '#94a3b8' }} />}
              </ListItemButton>

              <Collapse in={openDataEntry} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {roleId === 1 && (
                    <ListItemButton sx={subMenuButtonStyle('/hospital')} onClick={() => handleNavigate('/hospital')}>
                      <ListItemText primary="• โรงพยาบาล" />
                    </ListItemButton>
                  )}

                  <ListItemButton sx={subMenuButtonStyle('/linens')} onClick={() => handleNavigate('/linens')}>
                    <ListItemText primary="• สต็อกผ้า (Linen)" />
                  </ListItemButton>

                  {roleId === 1 && (
                    <>
                      <ListItemButton sx={subMenuButtonStyle('/vendors')} onClick={() => handleNavigate('/vendors')}>
                        <ListItemText primary="• บริษัทคู่ค้า" />
                      </ListItemButton>

                      <ListItemButton sx={subMenuButtonStyle('/users')} onClick={() => handleNavigate('/users')}>
                        <ListItemText primary="• บุคลากร (Users)" />
                      </ListItemButton>
                    </>
                  )}

                  <ListItemButton sx={subMenuButtonStyle('/rfid-connect')} onClick={() => handleNavigate('/rfid-connect')}>
                    <ListItemText primary="• เชื่อมต่อ RFID" />
                  </ListItemButton>

                </List>
              </Collapse>
            </>
          )}

        </List>
      </Box>

      {/* 3. Footer / User Profile */}
      <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
        {roleId === 1 && (
          <ListItemButton sx={{ ...menuButtonStyle('/settings'), mb: 1 }} onClick={() => handleNavigate('/settings')}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText primary="ตั้งค่าระบบ" primaryTypographyProps={{ fontSize: '0.95rem' }} />
          </ListItemButton>
        )}

        <Box sx={{
          bgcolor: '#f8fafc',
          borderRadius: 3,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <Avatar sx={{ bgcolor: activeColor, width: 40, height: 40, fontSize: '1rem', fontWeight: 600 }}>
            {user.firstName?.charAt(0)}
          </Avatar>
          <Box sx={{ ml: 1.5, flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap fontWeight="bold" sx={{ color: '#1e293b' }}>
              {user.firstName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: textSecondary }}>
              {roleId === 1 ? 'Administrator' : (roleId === 2 ? 'Sub-Admin' : 'Staff')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleLogout} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}>
            <Logout fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
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
            borderRight: 'none', // Remove default border
            boxShadow: '4px 0 24px rgba(0,0,0,0.02)' // Very soft shadow
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