import React, { useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Box, Collapse, Typography
} from '@mui/material';
import { 
  Home, ShowChart, EditNote, ExpandLess, ExpandMore,
  LocalHospital, Checkroom, Business, Person, Assignment, Settings, Sensors,
  CameraAlt, Delete, SystemUpdate 
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const drawerWidth = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDataEntry, setOpenDataEntry] = useState(true);

  // ✅ ดึง Role จาก LocalStorage (กัน Error ถ้าไม่มี User)
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : {};
  const roleId = user.roleId || 0; // 1 = Admin

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 600) onClose();
  };

  const isSelected = (path: string) => location.pathname === path;

  const menuButtonStyle = (path: string) => ({
    minHeight: 48, px: 2.5,
    color: isSelected(path) ? '#0ea5e9' : '#64748b',
    borderRight: isSelected(path) ? '4px solid #0ea5e9' : '4px solid transparent',
    backgroundColor: isSelected(path) ? '#f0f9ff' : 'transparent',
    '&:hover': { backgroundColor: '#f1f5f9' },
  });

  const subMenuButtonStyle = (path: string) => ({
    pl: 4, py: 1,
    color: isSelected(path) ? '#0ea5e9' : '#64748b',
    '& .MuiListItemIcon-root': { color: isSelected(path) ? '#0ea5e9' : '#94a3b8', minWidth: 35 },
    '& .MuiTypography-root': { fontSize: '0.9rem' }
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
        <Sensors sx={{ mr: 2, color: '#0ea5e9', fontSize: 30 }} />
        <Typography variant="h6" fontWeight="bold" color="text.primary" noWrap>Smart RFID</Typography>
      </Toolbar>
      
      <Box sx={{ overflow: 'auto', flexGrow: 1, py: 2 }}>
        <List component="nav">
          
          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/')} onClick={() => handleNavigate('/')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><Home /></ListItemIcon>
              <ListItemText primary="หน้าหลัก (Monitor)" />
            </ListItemButton>
          </ListItem>

          {/* เมนูเฉพาะ Admin */}
          {roleId === 1 && (
            <>
                <ListItem disablePadding>
                    <ListItemButton sx={menuButtonStyle('/stats')} onClick={() => handleNavigate('/stats')}>
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><ShowChart /></ListItemIcon>
                    <ListItemText primary="สถิติ (Dashboard)" />
                    </ListItemButton>
                </ListItem>

                <ListItemButton onClick={() => setOpenDataEntry(!openDataEntry)} sx={{ ...menuButtonStyle(''), color: '#64748b' }}>
                    <ListItemIcon sx={{ color: '#64748b', minWidth: 40 }}><EditNote /></ListItemIcon>
                    <ListItemText primary="บันทึกข้อมูล (Admin)" />
                    {openDataEntry ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openDataEntry} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={subMenuButtonStyle('/hospital')} onClick={() => handleNavigate('/hospital')}>
                            <ListItemIcon><LocalHospital fontSize="small" /></ListItemIcon><ListItemText primary="โรงพยาบาล" />
                        </ListItemButton>
                        <ListItemButton sx={subMenuButtonStyle('/linens')} onClick={() => handleNavigate('/linens')}>
                            <ListItemIcon><Checkroom fontSize="small" /></ListItemIcon><ListItemText primary="ผ้า" />
                        </ListItemButton>
                        <ListItemButton sx={subMenuButtonStyle('/vendors')} onClick={() => handleNavigate('/vendors')}>
                            <ListItemIcon><Business fontSize="small" /></ListItemIcon><ListItemText primary="บริษัท" />
                        </ListItemButton>
                        <ListItemButton sx={subMenuButtonStyle('/users')} onClick={() => handleNavigate('/users')}>
                            <ListItemIcon><Person fontSize="small" /></ListItemIcon><ListItemText primary="บุคลากร" />
                        </ListItemButton>
                        <ListItemButton sx={subMenuButtonStyle('/rfid-connect')} onClick={() => handleNavigate('/rfid-connect')}>
                            <ListItemIcon><CameraAlt fontSize="small" /></ListItemIcon><ListItemText primary="เชื่อม RFID" />
                        </ListItemButton>
                        <ListItemButton sx={subMenuButtonStyle('/readers')} onClick={() => handleNavigate('/readers')}>
                            <ListItemIcon><SystemUpdate fontSize="small" /></ListItemIcon><ListItemText primary="อุปกรณ์" />
                        </ListItemButton>
                    </List>
                </Collapse>
            </>
          )}

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/requests')} onClick={() => handleNavigate('/requests')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><Assignment /></ListItemIcon>
              <ListItemText primary="คำร้องเบิกผ้า" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {roleId === 1 && (
        <Box sx={{ p: 2 }}>
            <ListItemButton sx={{ borderRadius: 2, color: '#94a3b8' }} onClick={() => handleNavigate('/settings')}>
            <ListItemIcon sx={{ color: '#94a3b8', minWidth: 40 }}><Settings /></ListItemIcon>
            <ListItemText primary="ตั้งค่าระบบ" />
            </ListItemButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }}}>{drawerContent}</Drawer>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', boxShadow: '4px 0 24px rgba(0,0,0,0.02)' }}} open>{drawerContent}</Drawer>
    </Box>
  );
};

export default Sidebar;