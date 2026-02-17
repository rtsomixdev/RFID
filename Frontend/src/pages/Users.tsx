import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Select, MenuItem, Chip, Stack,
  Avatar, InputAdornment, Tab, Tabs,
  Checkbox, FormGroup, FormControlLabel, alpha, useTheme
} from '@mui/material';
import {
  Delete, PersonAdd, Edit, Save, Mail,
  Search, VpnKey, Badge as BadgeIcon, AdminPanelSettings, AddModerator,
  SupervisedUserCircle, VerifiedUser
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// --- Interfaces ---
interface Permission {
  permissionId: number;
  permissionCode: string;
  description: string;
}

interface RoleData {
  roleId: number;
  roleName: string;
  permissions: Permission[];
}

// --- Helper Functions ---
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name: string) {
  const nameParts = name.split(' ');
  const first = nameParts[0]?.[0] || '';
  const second = nameParts[1]?.[0] || '';
  return {
    sx: { bgcolor: stringToColor(name), width: 36, height: 36, fontSize: '0.9rem', fontWeight: 600 },
    children: `${first}${second}`.toUpperCase(),
  };
}

const Users: React.FC = () => {
  const theme = useTheme();
  // --- Global State ---
  const [tabIndex, setTabIndex] = useState(0); // 0 = Users, 1 = Roles
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ==========================================
  // 🟢 PART 1: USER MANAGEMENT STATES
  // ==========================================
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rolesList, setRolesList] = useState<any[]>([]); // For Dropdown
  const [titles, setTitles] = useState<any[]>([]);
  const [isEditUser, setIsEditUser] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: '', passwordHash: '', firstName: '', lastName: '', email: '',
    roleId: '', titleId: '', hospitalId: 1, wardId: 1
  });

  // ==========================================
  // 🟠 PART 2: ROLE MANAGEMENT STATES
  // ==========================================
  const [rolesData, setRolesData] = useState<RoleData[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isEditRole, setIsEditRole] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [roleForm, setRoleForm] = useState({
    roleName: '',
    selectedPermissions: [] as number[]
  });

  // --- Initialization ---
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (tabIndex === 0) filterUsers();
  }, [searchTerm, users, tabIndex]);

  const fetchInitialData = async () => {
    await fetchUsers();
    await fetchMasterData();
    await fetchRolesAndPermissions();
  };

  // --- API Calls ---
  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get('/User');
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMasterData = async () => {
    try {
      const [roleRes, titleRes] = await Promise.all([
        axiosClient.get('/Role'), // Get simple list for dropdown
        axiosClient.get('/Title')
      ]);
      setRolesList(roleRes.data);
      setTitles(titleRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchRolesAndPermissions = async () => {
    try {
      const [roleFullRes, permRes] = await Promise.all([
        axiosClient.get('/Role'),
        axiosClient.get('/Role/Permissions')
      ]);
      setRolesData(roleFullRes.data);
      setAllPermissions(permRes.data);
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // 🟢 LOGIC: USER MANAGEMENT
  // ==========================================
  const filterUsers = () => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = users.filter(u =>
      u.firstName?.toLowerCase().includes(lowerTerm) ||
      u.lastName?.toLowerCase().includes(lowerTerm) ||
      u.username?.toLowerCase().includes(lowerTerm) ||
      u.email?.toLowerCase().includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  };

  const handleEditUserClick = (user: any) => {
    setIsEditUser(true);
    setEditUserId(user.userId);
    setUserForm({
      username: user.username,
      passwordHash: '',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      roleId: user.roleId,
      titleId: user.titleId,
      hospitalId: user.hospitalId || 1,
      wardId: user.wardId || 1
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelUserEdit = () => {
    setIsEditUser(false);
    setEditUserId(null);
    setUserForm({ username: '', passwordHash: '', firstName: '', lastName: '', email: '', roleId: '', titleId: '', hospitalId: 1, wardId: 1 });
  };

  const handleSubmitUser = async () => {
    try {
      if (!userForm.username || !userForm.roleId) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลสำคัญให้ครบ', 'warning');

      let payload: any = {
        ...userForm,
        roleId: Number(userForm.roleId),
        titleId: Number(userForm.titleId),
        hospitalId: Number(userForm.hospitalId),
        wardId: Number(userForm.wardId),
        isActive: true
      };

      if (isEditUser && editUserId) {
        payload.userId = editUserId;
        if (!payload.passwordHash) payload.passwordHash = null;
        await axiosClient.put(`/User/${editUserId}`, payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขข้อมูลเรียบร้อย', timer: 1500, showConfirmButton: false });
      } else {
        if (!userForm.passwordHash) return Swal.fire('แจ้งเตือน', 'กรุณากำหนดรหัสผ่าน', 'warning');
        await axiosClient.post('/User', payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เพิ่มผู้ใช้งานเรียบร้อย', timer: 1500, showConfirmButton: false });
      }
      handleCancelUserEdit();
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      Swal.fire('บันทึกไม่สำเร็จ', err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', text: "ข้อมูลจะถูกลบถาวร", icon: 'warning', showCancelButton: true, confirmButtonColor: theme.palette.error.main
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/User/${id}`);
          Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500 });
          fetchUsers();
        } catch (err) { Swal.fire('Error', 'ไม่สามารถลบได้', 'error'); }
      }
    });
  };

  // ==========================================
  // 🟠 LOGIC: ROLE MANAGEMENT
  // ==========================================
  const handleCreateRole = () => {
    setIsEditRole(true);
    setEditRoleId(null);
    setRoleForm({ roleName: '', selectedPermissions: [] });
  };

  const handleEditRole = (role: any) => {
    setIsEditRole(true);
    setEditRoleId(role.roleId);
    setRoleForm({
      roleName: role.roleName,
      selectedPermissions: role.permissions.map((p: any) => p.permissionId)
    });
  };

  const handleCancelRole = () => {
    setIsEditRole(false);
    setEditRoleId(null);
    setRoleForm({ roleName: '', selectedPermissions: [] });
  };

  const handlePermissionToggle = (permId: number) => {
    setRoleForm(prev => {
      const current = prev.selectedPermissions;
      if (current.includes(permId)) return { ...prev, selectedPermissions: current.filter(id => id !== permId) };
      return { ...prev, selectedPermissions: [...current, permId] };
    });
  };

  const handleSubmitRole = async () => {
    if (!roleForm.roleName.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อ Role', 'warning');
    const payload = { roleName: roleForm.roleName, permissionIds: roleForm.selectedPermissions };

    try {
      if (editRoleId) {
        await axiosClient.put(`/Role/${editRoleId}`, payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'อัปเดต Role เรียบร้อย', showConfirmButton: false, timer: 1500 });
      } else {
        await axiosClient.post('/Role', payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'สร้าง Role ใหม่เรียบร้อย', showConfirmButton: false, timer: 1500 });
      }
      handleCancelRole();
      fetchRolesAndPermissions();
      fetchMasterData(); // Refresh dropdown list in User tab too
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteRole = async (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ Role?', text: "ผู้ใช้งานที่ถือ Role นี้อาจได้รับผลกระทบ", icon: 'warning', showCancelButton: true, confirmButtonColor: theme.palette.error.main
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/Role/${id}`);
          Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ลบ Role เรียบร้อย', showConfirmButton: false, timer: 1500 });
          fetchRolesAndPermissions();
        } catch (err: any) {
          Swal.fire('ลบไม่สำเร็จ', err.response?.data?.message, 'error');
        }
      }
    });
  };

  // --- Render ---
  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <PageHeader
        title="จัดการผู้ใช้งานและสิทธิ์"
        subtitle="ควบคุมการเข้าถึงระบบ จัดการบัญชีผู้ใช้ และกำหนดบทบาทหน้าที่"
        icon={<AdminPanelSettings fontSize="large" />}
        breadcrumbs={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'ตั้งค่าระบบ', href: '' },
          { label: 'ผู้ใช้งานและสิทธิ์' }
        ]}
      />

      {/* Tabs */}

      <Tabs
        value={tabIndex}
        onChange={(e, v) => setTabIndex(v)}
        sx={{
          minHeight: 48,
          mb: 2,
          '& .MuiTabs-flexContainer': { gap: 1 },
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            borderRadius: '10px',
            minHeight: 44,
            px: 3,
            color: theme.palette.text.secondary,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              color: theme.palette.primary.main,
            },
            '&.Mui-selected': {
              bgcolor: '#fff',
              color: theme.palette.primary.main,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }
          }
        }}
      >
        <Tab label="1. จัดการผู้ใช้งาน (Users)" icon={<SupervisedUserCircle fontSize="small" />} iconPosition="start" />
        <Tab label="2. จัดการบทบาท (Roles)" icon={<VerifiedUser fontSize="small" />} iconPosition="start" />
      </Tabs>

      {/* ======================= TAB 1: USERS ======================= */}
      {tabIndex === 0 && (
        <Box sx={{ animation: 'fadeIn 0.3s ease-in-out', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>

          {/* User Form Card */}
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
              bgcolor: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            <Box sx={{
              p: 3,
              bgcolor: isEditUser ? alpha(theme.palette.warning.main, 0.04) : alpha(theme.palette.primary.main, 0.04),
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex', alignItems: 'center', gap: 2
            }}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: isEditUser ? alpha(theme.palette.warning.main, 0.15) : alpha(theme.palette.primary.main, 0.15),
                  color: isEditUser ? theme.palette.warning.main : theme.palette.primary.main,
                  width: 48, height: 48
                }}
              >
                {isEditUser ? <Edit /> : <PersonAdd />}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="800" color="text.primary">
                  {isEditUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'ลงทะเบียนผู้ใช้งานใหม่'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isEditUser ? 'อัปเดตข้อมูลบัญชีผู้ใช้และสิทธิ์การเข้าถึง' : 'สร้างบัญชีผู้ใช้ใหม่เพื่อเข้าถึงระบบ'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 2' } }}>
                  <FormLabel label="คำนำหน้า" required>
                    <Select value={userForm.titleId} displayEmpty onChange={e => setUserForm({ ...userForm, titleId: e.target.value })} fullWidth>
                      <MenuItem value="" disabled>เลือก</MenuItem>
                      {titles.map((t) => <MenuItem key={t.titleId} value={t.titleId}>{t.titleNameTh}</MenuItem>)}
                    </Select>
                  </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                  <FormLabel label="ชื่อจริง" required>
                    <TextField fullWidth placeholder="ระบุชื่อจริง" value={userForm.firstName} onChange={e => setUserForm({ ...userForm, firstName: e.target.value })} />
                  </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                  <FormLabel label="นามสกุล" required>
                    <TextField fullWidth placeholder="ระบุนามสกุล" value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })} />
                  </FormLabel>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <FormLabel label="Username" required>
                    <TextField
                      fullWidth
                      placeholder="ตั้งชื่อผู้ใช้งาน"
                      value={userForm.username}
                      onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="action" /></InputAdornment> }}
                    />
                  </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <FormLabel label="ตำแหน่ง / Role" required>
                    <Select value={userForm.roleId} displayEmpty onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} fullWidth>
                      <MenuItem value="" disabled>เลือกตําแหน่ง</MenuItem>
                      {rolesList.map((r) => <MenuItem key={r.roleId} value={r.roleId}>{r.roleName}</MenuItem>)}
                    </Select>
                  </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                  <FormLabel label={isEditUser ? "รหัสผ่านใหม่ (ไม่เปลี่ยนเว้นว่าง)" : "รหัสผ่าน"} required={!isEditUser}>
                    <TextField
                      fullWidth
                      type="password"
                      placeholder="********"
                      value={userForm.passwordHash}
                      onChange={e => setUserForm({ ...userForm, passwordHash: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" color="action" /></InputAdornment> }}
                    />
                  </FormLabel>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <FormLabel label="อีเมล">
                    <TextField
                      fullWidth
                      placeholder="example@email.com"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Mail fontSize="small" color="action" /></InputAdornment> }}
                    />
                  </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' }, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  {isEditUser ? (
                    <>
                      <Button variant="contained" color="warning" startIcon={<Save />} onClick={handleSubmitUser} fullWidth sx={{ height: 42 }}>บันทึกการแก้ไข</Button>
                      <Button variant="outlined" color="inherit" onClick={handleCancelUserEdit} fullWidth sx={{ height: 42 }}>ยกเลิก</Button>
                    </>
                  ) : (
                    <Button variant="contained" startIcon={<PersonAdd />} onClick={handleSubmitUser} fullWidth sx={{ height: 42 }}>เพิ่มผู้ใช้งาน</Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* User Table */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="700" color="text.primary">
                ผู้ใช้งานทั้งหมด <Chip label={filteredUsers.length} color="primary" size="small" sx={{ ml: 1, fontWeight: 'bold', borderRadius: 1 }} />
              </Typography>
              <TextField
                size="small"
                placeholder="ค้นหาชื่อ, Username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                sx={{ width: 280, bgcolor: '#fff', borderRadius: 1 }}
              />
            </Stack>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, maxHeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{
                    '& th': {
                      bgcolor: alpha('#f8fafc', 0.95),
                      fontWeight: 700,
                      color: theme.palette.text.secondary,
                      borderBottom: `1px solid ${theme.palette.divider}`
                    }
                  }}>
                    <TableCell>ข้อมูลผู้ใช้งาน</TableCell>
                    <TableCell>ช่องทางติดต่อ</TableCell>
                    <TableCell>บัญชี</TableCell>
                    <TableCell>สิทธิ์การใช้งาน</TableCell>
                    <TableCell align="center">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                      <SupervisedUserCircle sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
                      <Typography>ไม่พบข้อมูลผู้ใช้งาน</Typography>
                    </TableCell></TableRow>
                  ) : filteredUsers.map((u) => (
                    <TableRow key={u.userId} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar {...stringAvatar(`${u.firstName} ${u.lastName}`)} />
                          <Box>
                            <Typography variant="body2" fontWeight="600">{u.firstName} {u.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">ID: {u.userId}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Mail fontSize="small" color="action" sx={{ fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">{u.email || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={u.username} size="small" variant="outlined" sx={{ borderRadius: 1, borderColor: theme.palette.divider, fontWeight: 500 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rolesList.find(r => r.roleId === u.roleId)?.roleName || '-'}
                          size="small"
                          sx={{ fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton size="small" onClick={() => handleEditUserClick(u)} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          {currentUser?.userId !== u.userId && (
                            <IconButton size="small" onClick={() => handleDeleteUser(u.userId)} sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

      {/* ======================= TAB 2: ROLES ======================= */}
      {tabIndex === 1 && (
        <Box sx={{ animation: 'fadeIn 0.3s ease-in-out', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
            {/* Role Form */}
            <Box sx={{ flex: { lg: 5 }, width: '100%' }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ p: 3, bgcolor: isEditRole ? alpha(theme.palette.warning.main, 0.04) : alpha(theme.palette.primary.main, 0.04), borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar variant="rounded" sx={{ bgcolor: isEditRole ? alpha(theme.palette.warning.main, 0.15) : alpha(theme.palette.primary.main, 0.15), color: isEditRole ? theme.palette.warning.main : theme.palette.primary.main }}>
                      {isEditRole ? <Edit /> : <AddModerator />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{isEditRole ? 'แก้ไขบทบาท' : 'สร้างบทบาทใหม่'}</Typography>
                      <Typography variant="caption" color="text.secondary">กำหนดชื่อและสิทธิ์การเข้าถึง</Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ p: 3 }}>
                  <FormLabel label="ชื่อบทบาท (Role Name)" required>
                    <TextField fullWidth placeholder="เช่น Admin, Staff..." value={roleForm.roleName} onChange={e => setRoleForm({ ...roleForm, roleName: e.target.value })} sx={{ mb: 3 }} />
                  </FormLabel>

                  <FormLabel label="กำหนดสิทธิ์การใช้งาน (Permissions)">
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflowY: 'auto', bgcolor: '#f8fafc', borderRadius: 2 }}>
                      <FormGroup>
                        {allPermissions.map((perm) => (
                          <FormControlLabel
                            key={perm.permissionId}
                            control={<Checkbox checked={roleForm.selectedPermissions.includes(perm.permissionId)} onChange={() => handlePermissionToggle(perm.permissionId)} size="small" />}
                            label={
                              <Box sx={{ py: 0.5 }}>
                                <Typography variant="body2" fontWeight="600">{perm.permissionCode}</Typography>
                                <Typography variant="caption" color="text.secondary">{perm.description}</Typography>
                              </Box>
                            }
                            sx={{ mb: 1, '&:last-child': { mb: 0 }, alignItems: 'flex-start' }}
                          />
                        ))}
                      </FormGroup>
                    </Paper>
                  </FormLabel>

                  <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="inherit" onClick={handleCancelRole} fullWidth>ยกเลิก</Button>
                    <Button variant="contained" color={isEditRole ? "warning" : "primary"} onClick={handleSubmitRole} startIcon={<Save />} fullWidth>
                      {isEditRole ? "บันทึก" : "สร้างใหม่"}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
              {!isEditRole && (
                <Button fullWidth variant="contained" startIcon={<AddModerator />} onClick={handleCreateRole} sx={{ mt: 2, py: 1.5, borderRadius: 2, boxShadow: 'none' }}>
                  เพิ่มบทบาทใหม่
                </Button>
              )}
            </Box>

            {/* Role List */}
            <Box sx={{ flex: { lg: 7 }, width: '100%' }}>
              <Paper elevation={0} sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" fontWeight="bold">รายการบทบาททั้งหมด</Typography>
                </Box>
                <Box sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha('#f8fafc', 0.95) }}>
                        <TableRow>
                          <TableCell width="30%">ชื่อบทบาท</TableCell>
                          <TableCell width="50%">สิทธิ์ที่ได้รับ</TableCell>
                          <TableCell width="20%" align="center">จัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rolesData.map((role) => (
                          <TableRow key={role.roleId} hover selected={editRoleId === role.roleId}>
                            <TableCell><Typography variant="subtitle2" fontWeight="bold" color="primary">{role.roleName}</Typography></TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {role.permissions.map((p) => (
                                  <Chip key={p.permissionId} label={p.permissionCode} size="small" sx={{ fontSize: '0.7rem', borderRadius: 1 }} />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton size="small" onClick={() => handleEditRole(role)} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }}><Edit fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => handleDeleteRole(role.roleId)} sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.05) }}><Delete fontSize="small" /></IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>
            </Box>
          </Stack>
        </Box>
      )}

    </Box >
  );
};

export default Users;