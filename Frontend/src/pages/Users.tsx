import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Stack,
  Avatar, Card, CardContent, Divider, InputAdornment, Tooltip
} from '@mui/material';
import { 
  Delete, PersonAdd, Edit, CleaningServices, Save, Mail, 
  Search, VpnKey, Badge, AccountCircle, AdminPanelSettings, SupervisorAccount
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

// Helper: สร้างสี Avatar จากชื่อ
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
  const [currentUser, setCurrentUser] = useState<any>(null); // ✅ เก็บข้อมูลคน Login
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [roles, setRoles] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    username: '', passwordHash: '', firstName: '', lastName: '', email: '',
    roleId: '', titleId: '', hospitalId: 1, wardId: 1
  });

  useEffect(() => {
    // ✅ 1. ดึงข้อมูลคน Login ออกมาเพื่อเช็คว่า "ฉันคือใคร"
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        setCurrentUser(JSON.parse(userStr));
    }

    fetchUsers();
    fetchMasterData();
  }, []);

  // Search Logic
  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = users.filter(u => 
        u.firstName?.toLowerCase().includes(lowerTerm) || 
        u.lastName?.toLowerCase().includes(lowerTerm) ||
        u.username?.toLowerCase().includes(lowerTerm) ||
        u.email?.toLowerCase().includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

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
        axiosClient.get('/Role'), axiosClient.get('/Title')
      ]);
      setRoles(roleRes.data);
      setTitles(titleRes.data);
    } catch (err) { console.error(err); }
  };

  const handleEditClick = (user: any) => {
    setIsEdit(true);
    setEditId(user.userId);
    setFormData({
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

  const handleCancelEdit = () => {
    setIsEdit(false);
    setEditId(null);
    setFormData({ username: '', passwordHash: '', firstName: '', lastName: '', email: '', roleId: '', titleId: '', hospitalId: 1, wardId: 1 });
  };

  const handleSubmit = async () => {
    try {
      if(!formData.username || !formData.roleId) {
        return Swal.fire('แจ้งเตือน', 'กรุณากรอก Username และ ตำแหน่ง', 'warning');
      }

      let payload: any = {
          ...formData,
          roleId: Number(formData.roleId),
          titleId: Number(formData.titleId),
          hospitalId: Number(formData.hospitalId),
          wardId: Number(formData.wardId),
          isActive: true
      };

      if (isEdit && editId) {
        payload.userId = editId;
        if (!payload.passwordHash) payload.passwordHash = null;
        await axiosClient.put(`/User/${editId}`, payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขข้อมูลเรียบร้อย', timer: 1500, showConfirmButton: false });
      } else {
        if(!formData.passwordHash) return Swal.fire('แจ้งเตือน', 'กรุณากำหนดรหัสผ่าน', 'warning');
        await axiosClient.post('/User', payload);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เพิ่มผู้ใช้งานเรียบร้อย', timer: 1500, showConfirmButton: false });
      }

      handleCancelEdit();
      fetchUsers();
    } catch(err: any) { 
        console.error(err);
        const msg = err.response?.data?.message || 'โปรดตรวจสอบข้อมูลอีกครั้ง';
        Swal.fire('บันทึกไม่สำเร็จ', msg, 'error'); 
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', 
      text: "คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่",
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'ลบ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
            await axiosClient.delete(`/User/${id}`);
            Swal.fire('ลบสำเร็จ', 'ลบผู้ใช้งานเรียบร้อย', 'success');
            fetchUsers();
        } catch (err) {
            Swal.fire('Error', 'ไม่สามารถลบได้ (อาจมีข้อมูลเชื่อมโยง)', 'error');
        }
      }
    });
  };

  // Helper เลือกสี Chip ของ Role
  const getRoleColor = (roleId: number) => {
    switch(roleId) {
        case 1: return 'error'; // Admin
        case 2: return 'warning'; // Manager
        default: return 'primary'; // Staff
    }
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
            <AdminPanelSettings fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                จัดการบุคลากร (Users)
            </Typography>
            <Typography variant="body2" color="textSecondary">
                เพิ่ม ลบ แก้ไข ข้อมูลผู้ใช้งานและกำหนดสิทธิ์การเข้าถึง
            </Typography>
        </Box>
      </Box>
      
      {/* Form Section */}
      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <Box sx={{ p: 2, bgcolor: isEdit ? '#fff7ed' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            {isEdit ? <Edit color="warning" /> : <PersonAdd color="primary" />}
            <Typography variant="subtitle1" fontWeight="bold" color={isEdit ? 'warning.main' : 'primary.main'}>
                {isEdit ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* 1. ข้อมูลส่วนตัว */}
                <Grid item xs={12}>
                    <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ข้อมูลส่วนตัว (Personal Info)</Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>คำนำหน้า</InputLabel>
                        <Select value={formData.titleId} label="คำนำหน้า" onChange={e => setFormData({...formData, titleId: e.target.value})}>
                            {titles.map((t) => <MenuItem key={t.titleId} value={t.titleId}>{t.titleNameTh}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField fullWidth size="small" label="ชื่อจริง" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><AccountCircle fontSize="small" color="action"/></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField fullWidth size="small" label="นามสกุล" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth size="small" label="อีเมล" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        InputProps={{ startAdornment: <InputAdornment position="start"><Mail fontSize="small" color="action"/></InputAdornment> }}
                    />
                </Grid>

                 {/* 2. ข้อมูลเข้าระบบ */}
                 <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ข้อมูลเข้าระบบ (Account & Security)</Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" label="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action"/></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" type="password" label={isEdit ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน"} value={formData.passwordHash} onChange={e => setFormData({...formData, passwordHash: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey fontSize="small" color="action"/></InputAdornment> }} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>ตำแหน่ง / สิทธิ์</InputLabel>
                        <Select value={formData.roleId} label="ตำแหน่ง / สิทธิ์" onChange={e => setFormData({...formData, roleId: e.target.value})}>
                            {roles.map((r) => <MenuItem key={r.roleId} value={r.roleId}>{r.roleName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                
                {/* Action Buttons */}
                <Grid item xs={12} sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    {isEdit && <Button variant="outlined" color="inherit" onClick={handleCancelEdit} startIcon={<CleaningServices />}>ยกเลิก</Button>}
                    <Button variant="contained" color={isEdit ? "warning" : "primary"} startIcon={isEdit ? <Save /> : <PersonAdd />} onClick={handleSubmit} sx={{ px: 4, borderRadius: 2 }}>
                        {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มบุคลากร'}
                    </Button>
                </Grid>
            </Grid>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SupervisorAccount color="primary"/> รายชื่อบุคลากรทั้งหมด <Chip label={filteredUsers.length} size="small" color="primary" sx={{ ml: 1, borderRadius: 1 }} />
            </Typography>
            
            <TextField
                size="small"
                placeholder="ค้นหา (ชื่อ, อีเมล, User)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
            />
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>User Profile</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Account</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Role</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#64748b' }}>Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94a3b8' }}>ไม่พบข้อมูล</TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.userId} hover>
                  <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar {...stringAvatar(`${u.firstName} ${u.lastName}`)} />
                          <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {u.firstName} {u.lastName} 
                                {/* ✅ ถ้าเป็นตัวเอง ใส่ (Me) ต่อท้าย */}
                                {currentUser?.userId === u.userId && <span style={{color: '#3b82f6'}}> (Me)</span>}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">ID: {u.userId}</Typography>
                          </Box>
                      </Stack>
                  </TableCell>
                  <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569' }}>
                         <Mail fontSize="inherit" /> <Typography variant="body2">{u.email || '-'}</Typography>
                      </Box>
                  </TableCell>
                  <TableCell>
                      <Chip label={u.username} size="small" variant="outlined" sx={{ borderRadius: 1, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>
                      <Chip 
                        label={roles.find(r=>r.roleId === u.roleId)?.roleName || '-'} 
                        size="small" 
                        color={getRoleColor(u.roleId) as any}
                        sx={{ fontWeight: 'bold' }}
                      />
                  </TableCell>
                  <TableCell align="center">
                      <Tooltip title="แก้ไข">
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(u)} sx={{ bgcolor: '#eff6ff', mr: 1, '&:hover': { bgcolor: '#dbeafe' } }}>
                            <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {/* ✅✅✅ ซ่อนปุ่มลบ ถ้าเป็น User ของตัวเอง */}
                      {currentUser?.userId !== u.userId && (
                          <Tooltip title="ลบ">
                            <IconButton size="small" color="error" onClick={() => handleDelete(u.userId)} sx={{ bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}>
                                <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};
export default Users;