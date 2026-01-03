import React, { useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Box, Collapse, Typography, Avatar, Divider, IconButton
} from '@mui/material';
import { 
  Home, ShowChart, EditNote, ExpandLess, ExpandMore,
  LocalHospital, Checkroom, Business, Person, Assignment, Settings, Sensors,
  CameraAlt, SystemUpdate, DeleteForever, Logout, ChevronRight
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const drawerWidth = 280; // ขยายความกว้างนิดนึงให้ดูโปร่ง

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDataEntry, setOpenDataEntry] = useState(true);

  // ดึงข้อมูล User
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
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
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

  // --- Styles ---
  // สีพื้นหลัง Sidebar
  const sidebarBg = '#0f172a'; // Slate 900
  const textPrimary = '#f8fafc'; // Slate 50
  const textSecondary = '#94a3b8'; // Slate 400
  const activeGradient = 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)'; // Blue Gradient

  // สไตล์ปุ่มเมนูหลัก
  const menuButtonStyle = (path: string) => ({
    mb: 0.5,
    mx: 2,
    borderRadius: '12px', // มุมมน
    transition: 'all 0.3s ease',
    color: isSelected(path) ? '#fff' : textSecondary,
    background: isSelected(path) ? activeGradient : 'transparent',
    boxShadow: isSelected(path) ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
    '&:hover': { 
        backgroundColor: isSelected(path) ? '' : 'rgba(255,255,255,0.05)',
        color: '#fff',
        transform: 'translateX(5px)'
    },
  });

  // สไตล์ปุ่มเมนูย่อย
  const subMenuButtonStyle = (path: string) => ({
    pl: 4, 
    py: 1,
    mx: 2,
    mt: 0.5,
    borderRadius: '8px',
    color: isSelected(path) ? '#38bdf8' : textSecondary,
    bgcolor: isSelected(path) ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
    borderLeft: isSelected(path) ? '3px solid #38bdf8' : '3px solid transparent',
    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
    '& .MuiTypography-root': { fontSize: '0.85rem', fontWeight: isSelected(path) ? 600 : 400 }
  });

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: sidebarBg, color: textPrimary }}>
      
      {/* 1. Logo Section */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', px: 3, py: 4, mb: 1 }}>
        <Box 
            sx={{ 
                width: 40, height: 40, borderRadius: '10px', 
                background: activeGradient, display: 'flex', 
                alignItems: 'center', justifyContent: 'center', mr: 2,
                boxShadow: '0 0 15px rgba(14, 165, 233, 0.5)'
            }}
        >
            <Sensors sx={{ color: '#fff' }} />
        </Box>
        <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1, letterSpacing: 0.5 }}>
                Smart RFID
            </Typography>
            <Typography variant="caption" sx={{ color: textSecondary, fontSize: '0.7rem' }}>
                Linen Management System
            </Typography>
        </Box>
      </Toolbar>
      
      {/* 2. Menu List */}
      <Box sx={{ overflow: 'auto', flexGrow: 1, py: 1 }}>
        <List component="nav">
          
          <Typography variant="caption" sx={{ px: 3, mb: 1, display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>
              MAIN MENU
          </Typography>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/')} onClick={() => handleNavigate('/')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><Home fontSize="small" /></ListItemIcon>
              <ListItemText primary="หน้าหลัก (Monitor)" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/stats')} onClick={() => handleNavigate('/stats')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><ShowChart fontSize="small" /></ListItemIcon>
              <ListItemText primary="สถิติ (Dashboard)" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/requests')} onClick={() => handleNavigate('/requests')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><Assignment fontSize="small" /></ListItemIcon>
              <ListItemText primary="คำร้องเบิกผ้า" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
          
           {/* เมนูแจ้งชำรุด */}
           <ListItem disablePadding>
            <ListItemButton sx={menuButtonStyle('/discard')} onClick={() => handleNavigate('/discard')}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><DeleteForever fontSize="small" /></ListItemIcon>
              <ListItemText primary="แจ้งชำรุด/หาย" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>

          {/* Admin Section */}
          {(roleId === 1 || roleId === 2) && (
            <>
                <Typography variant="caption" sx={{ px: 3, mt: 3, mb: 1, display: 'block', color: '#64748b', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    MANAGEMENT
                </Typography>

                <ListItemButton onClick={() => setOpenDataEntry(!openDataEntry)} sx={{ ...menuButtonStyle(''), justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><EditNote fontSize="small" /></ListItemIcon>
                        <ListItemText primary="จัดการข้อมูล" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
                    </Box>
                    {openDataEntry ? <ExpandLess fontSize="small" /> : <ChevronRight fontSize="small" />}
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
                        
                        <ListItemButton sx={subMenuButtonStyle('/readers')} onClick={() => handleNavigate('/readers')}>
                            <ListItemText primary="• อุปกรณ์ (Readers)" />
                        </ListItemButton>
                    </List>
                </Collapse>
            </>
          )}

        </List>
      </Box>

      {/* 3. Footer / User Profile */}
      <Box sx={{ p: 2 }}>
        {roleId === 1 && (
             <ListItemButton sx={{ ...menuButtonStyle('/settings'), mb: 2 }} onClick={() => handleNavigate('/settings')}>
                <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}><Settings fontSize="small" /></ListItemIcon>
                <ListItemText primary="ตั้งค่าระบบ" primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }} />
            </ListItemButton>
        )}

        <Box sx={{ 
            bgcolor: 'rgba(255,255,255,0.03)', 
            borderRadius: 3, 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <Avatar sx={{ bgcolor: '#3b82f6', width: 36, height: 36, fontSize: '0.9rem' }}>
                {user.firstName?.charAt(0)}
            </Avatar>
            <Box sx={{ ml: 1.5, flexGrow: 1, overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap fontWeight="bold" sx={{ color: '#fff' }}>
                    {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: textSecondary }}>
                    {roleId === 1 ? 'Administrator' : (roleId === 2 ? 'Sub-Admin' : 'Staff')}
                </Typography>
            </Box>
            <IconButton size="small" onClick={handleLogout} sx={{ color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)', '&:hover':{ bgcolor: '#ef4444', color: 'white' } }}>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, bgcolor: sidebarBg }
        }}
      >
        {drawerContent}
      </Drawer>
      
      <Drawer 
        variant="permanent" 
        sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', bgcolor: sidebarBg }
        }} 
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;