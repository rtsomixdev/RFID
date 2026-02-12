import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Stack,
  Avatar, Card, CardContent, Divider, InputAdornment, Tooltip, Tab, Tabs,
  Checkbox, FormGroup, FormControlLabel, Collapse, Alert
} from '@mui/material';
import {
  Delete, PersonAdd, Edit, CleaningServices, Save, Mail,
  Search, VpnKey, Badge, AccountCircle, AdminPanelSettings, SupervisorAccount,
  Security, AddModerator, Cancel, CheckCircle
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

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
    sx: { bgcolor: stringToColor(name), width: 32, height: 32, fontSize: '0.9rem' },
    children: `${first}${second}`.toUpperCase(),
  };
}

const Users: React.FC = () => {
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
      title: 'ยืนยันการลบ?', text: "ข้อมูลจะถูกลบถาวร", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/User/${id}`);
          Swal.fire('ลบสำเร็จ', '', 'success');
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
        Swal.fire('สำเร็จ', 'อัปเดต Role เรียบร้อย', 'success');
      } else {
        await axiosClient.post('/Role', payload);
        Swal.fire('สำเร็จ', 'สร้าง Role ใหม่เรียบร้อย', 'success');
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
      title: 'ยืนยันการลบ Role?', text: "ผู้ใช้งานที่ถือ Role นี้อาจได้รับผลกระทบ", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/Role/${id}`);
          Swal.fire('สำเร็จ', 'ลบ Role เรียบร้อย', 'success');
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
          <AdminPanelSettings fontSize="large" />
        </Paper>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
            จัดการผู้ใช้งานและสิทธิ์ (User & Role Management)
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ควบคุมการเข้าถึงระบบ จัดการบัญชีผู้ใช้ และกำหนดบทบาทหน้าที่
          </Typography>
        </Box>
      </Box>

      {/* Tabs Switcher */}
      <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} aria-label="management tabs">
          <Tab label="1. จัดการผู้ใช้งาน (Users)" sx={{ fontWeight: 'bold' }} />
          <Tab label="2. จัดการบทบาทและสิทธิ์ (Roles & Permissions)" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Paper>

      {/* ======================= TAB 1: USERS ======================= */}
      {tabIndex === 0 && (
        <>
          {/* User Form */}
          <Card elevation={2} sx={{ mb: 4, borderRadius: 3 }}>
            <Box sx={{ p: 2, bgcolor: isEditUser ? '#fff7ed' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
              {isEditUser ? <Edit color="warning" /> : <PersonAdd color="primary" />}
              <Typography variant="subtitle1" fontWeight="bold" color={isEditUser ? 'warning.main' : 'primary.main'}>
                {isEditUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>คำนำหน้า</InputLabel>
                    <Select value={userForm.titleId} label="คำนำหน้า" onChange={e => setUserForm({ ...userForm, titleId: e.target.value })}>
                      {titles.map((t) => <MenuItem key={t.titleId} value={t.titleId}>{t.titleNameTh}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="ชื่อจริง" value={userForm.firstName} onChange={e => setUserForm({ ...userForm, firstName: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="นามสกุล" value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>ตำแหน่ง / Role</InputLabel>
                    <Select value={userForm.roleId} label="ตำแหน่ง / Role" onChange={e => setUserForm({ ...userForm, roleId: e.target.value })}>
                      {rolesList.map((r) => <MenuItem key={r.roleId} value={r.roleId}>{r.roleName}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="password" label={isEditUser ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน"} value={userForm.passwordHash} onChange={e => setUserForm({ ...userForm, passwordHash: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="อีเมล" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Mail fontSize="small" /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {isEditUser && <Button variant="outlined" color="inherit" onClick={handleCancelUserEdit}>ยกเลิก</Button>}
                  <Button variant="contained" color={isEditUser ? "warning" : "primary"} startIcon={<Save />} onClick={handleSubmitUser}>
                    {isEditUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* User Table */}
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">รายชื่อผู้ใช้งาน ({filteredUsers.length})</Typography>
              <TextField size="small" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <Search color="action" /> }} sx={{ width: 300 }} />
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell>User Profile</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.userId} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar {...stringAvatar(`${u.firstName} ${u.lastName}`)} />
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{u.firstName} {u.lastName}</Typography>
                            <Typography variant="caption" color="textSecondary">ID: {u.userId}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.email || '-'}</TableCell>
                      <TableCell><Chip label={u.username} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={rolesList.find(r => r.roleId === u.roleId)?.roleName || '-'} size="small" color="primary" /></TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleEditUserClick(u)}><Edit fontSize="small" /></IconButton>
                        {currentUser?.userId !== u.userId && <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.userId)}><Delete fontSize="small" /></IconButton>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* ======================= TAB 2: ROLES ======================= */}
      {tabIndex === 1 && (
        <Grid container spacing={3}>
          {/* Role Form */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ mb: 3, borderRadius: 3, border: isEditRole ? '1px solid #f59e0b' : 'none' }}>
              <Box sx={{ p: 2, bgcolor: isEditRole ? '#fffbeb' : '#f0f9ff', display: 'flex', alignItems: 'center', gap: 1 }}>
                {isEditRole ? <Edit color="warning" /> : <AddModerator color="primary" />}
                <Typography variant="subtitle1" fontWeight="bold">
                  {isEditRole ? 'แก้ไขบทบาท (Edit Role)' : 'สร้างบทบาทใหม่ (New Role)'}
                </Typography>
              </Box>
              <CardContent>
                <TextField fullWidth label="ชื่อบทบาท (Role Name)" value={roleForm.roleName} onChange={e => setRoleForm({ ...roleForm, roleName: e.target.value })} sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>เลือกสิทธิ์ (Permissions)</Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflowY: 'auto', bgcolor: '#fafafa' }}>
                  <FormGroup>
                    {allPermissions.map((perm) => (
                      <FormControlLabel
                        key={perm.permissionId}
                        control={<Checkbox checked={roleForm.selectedPermissions.includes(perm.permissionId)} onChange={() => handlePermissionToggle(perm.permissionId)} size="small" />}
                        label={<Box><Typography variant="body2" fontWeight="bold">{perm.permissionCode}</Typography><Typography variant="caption" color="textSecondary">{perm.description}</Typography></Box>}
                      />
                    ))}
                  </FormGroup>
                </Paper>
                <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={handleCancelRole}>ยกเลิก</Button>
                  <Button variant="contained" color={isEditRole ? "warning" : "primary"} onClick={handleSubmitRole} startIcon={<Save />}>
                    {isEditRole ? "บันทึก" : "สร้างใหม่"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            {!isEditRole && (
              <Button fullWidth variant="contained" startIcon={<AddModerator />} onClick={handleCreateRole} sx={{ mb: 3, py: 1.5 }}>
                สร้างบทบาทใหม่
              </Button>
            )}
          </Grid>

          {/* Role List */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell>ชื่อบทบาท</TableCell>
                        <TableCell>สิทธิ์ที่ได้รับ</TableCell>
                        <TableCell align="center">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rolesData.map((role) => (
                        <TableRow key={role.roleId} hover>
                          <TableCell><Typography variant="subtitle2" fontWeight="bold" color="primary">{role.roleName}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {role.permissions.map((p) => (
                                <Chip key={p.permissionId} label={p.permissionCode} size="small" sx={{ fontSize: '0.7rem' }} />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => handleEditRole(role)}><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteRole(role.roleId)}><Delete fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Users;