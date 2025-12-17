import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid as Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Stack
} from '@mui/material';
import { Delete, PersonAdd, Edit, CleaningServices, Save, Mail } from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    username: '', passwordHash: '', firstName: '', lastName: '', email: '',
    roleId: '', titleId: '', hospitalId: 1, wardId: 1
  });

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get('/User');
      setUsers(res.data);
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
      hospitalId: user.hospitalId || 1, // ป้องกัน null
      wardId: user.wardId || 1 // ป้องกัน null
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
        // ✅ ส่ง userId ไปด้วย
        payload.userId = editId;
        
        // ถ้าไม่แก้รหัสผ่าน ให้ส่งเป็น null หรือ empty string (Backend เราแก้ให้รองรับแล้ว)
        if (!payload.passwordHash) payload.passwordHash = null;

        await axiosClient.put(`/User/${editId}`, payload);
        Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success');
      } else {
        if(!formData.passwordHash) return Swal.fire('แจ้งเตือน', 'กรุณากำหนดรหัสผ่าน', 'warning');
        await axiosClient.post('/User', payload);
        Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้งานเรียบร้อย', 'success');
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
      title: 'ยืนยันลบ?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await axiosClient.delete(`/User/${id}`);
        fetchUsers();
      }
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>จัดการบุคลากร</Typography>
      
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4, boxShadow: 'none', border: '1px solid #e2e8f0', bgcolor: isEdit ? '#fffbeb' : '#fff' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: isEdit ? '#d97706' : '#475569' }}>
           {isEdit ? '✏️ แก้ไขข้อมูลผู้ใช้งาน' : '➕ เพิ่มผู้ใช้งานใหม่'}
        </Typography>
        <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth>
                    <InputLabel>คำนำหน้า</InputLabel>
                    <Select value={formData.titleId} label="คำนำหน้า" onChange={e => setFormData({...formData, titleId: e.target.value})}>
                        {titles.map((t) => <MenuItem key={t.titleId} value={t.titleId}>{t.titleNameTh}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="ชื่อจริง" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></Grid>
            <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="นามสกุล" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                    fullWidth label="อีเมล" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    InputProps={{ endAdornment: <Mail color="action" /> }}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth type="password" label={isEdit ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน"} value={formData.passwordHash} onChange={e => setFormData({...formData, passwordHash: e.target.value})} />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                    <InputLabel>ตำแหน่ง</InputLabel>
                    <Select value={formData.roleId} label="ตำแหน่ง" onChange={e => setFormData({...formData, roleId: e.target.value})}>
                        {roles.map((r) => <MenuItem key={r.roleId} value={r.roleId}>{r.roleName}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Stack direction="row" spacing={2}>
                    {isEdit && <Button variant="outlined" color="inherit" onClick={handleCancelEdit} startIcon={<CleaningServices />}>ยกเลิก</Button>}
                    <Button variant="contained" color={isEdit ? "warning" : "primary"} startIcon={isEdit ? <Save /> : <PersonAdd />} onClick={handleSubmit}>
                        {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มบุคลากร'}
                    </Button>
                </Stack>
            </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 4, border: '1px solid #e2e8f0' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                    <TableCell>ชื่อ-สกุล</TableCell>
                    <TableCell>อีเมล</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell align="center">จัดการ</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>{u.firstName} {u.lastName}</TableCell>
                  <TableCell>{u.email || '-'}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell><Chip label={roles.find(r=>r.roleId === u.roleId)?.roleName || '-'} size="small" /></TableCell>
                  <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleEditClick(u)}><Edit /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(u.userId)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
export default Users;