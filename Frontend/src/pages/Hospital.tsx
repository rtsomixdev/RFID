import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Tabs, Tab, Stack, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { 
  AddCircle, Delete, Domain, MeetingRoom, Edit 
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const HospitalPage: React.FC = () => {
  // --- States ---
  const [tabValue, setTabValue] = useState(0);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Forms
  const [hospitalForm, setHospitalForm] = useState({ name: '', address: '', contact: '' });
  const [wardForm, setWardForm] = useState({ name: '', hospitalId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hospRes, wardRes] = await Promise.all([
        axiosClient.get('/Hospital'),
        axiosClient.get('/Ward')
      ]);
      setHospitals(hospRes.data);
      setWards(wardRes.data);
    } catch (err) { console.error(err); }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // --- Logic โรงพยาบาล ---
  const handleAddHospital = async () => {
    if (!hospitalForm.name) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อโรงพยาบาล', 'warning');
    
    try {
      await axiosClient.post('/Hospital', {
        hospitalName: hospitalForm.name,
        address: hospitalForm.address,
        contactInfo: hospitalForm.contact
      });
      Swal.fire('สำเร็จ', 'เพิ่มโรงพยาบาลเรียบร้อย', 'success');
      setHospitalForm({ name: '', address: '', contact: '' });
      fetchData();
    } catch (err: any) {
      Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteHospital = (id: number, name: string) => {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `ต้องการลบโรงพยาบาล "${name}" หรือไม่? ข้อมูลวอร์ดที่เกี่ยวข้องอาจถูกลบด้วย`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ยืนยันลบ',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.delete(`/Hospital/${id}`);
                Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', 'ลบไม่สำเร็จ (อาจมีข้อมูลอ้างอิงอยู่)', 'error');
            }
        }
    });
  };

  // --- Logic วอร์ด (Ward) ---
  const handleAddWard = async () => {
    if (!wardForm.name || !wardForm.hospitalId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อวอร์ดและโรงพยาบาล', 'warning');

    try {
      await axiosClient.post('/Ward', {
        wardName: wardForm.name,
        hospitalId: parseInt(wardForm.hospitalId),
        isActive: true
      });
      Swal.fire('สำเร็จ', 'เพิ่มวอร์ดเรียบร้อย', 'success');
      setWardForm({ ...wardForm, name: '' }); // Clear แค่ชื่อ
      fetchData();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'บันทึกไม่สำเร็จ: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // ✅✅✅ ฟังก์ชันลบวอร์ด (ต้องมี SweetAlert ตรงนี้ครับ)
  const handleDeleteWard = (id: number, name: string) => {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `ต้องการลบวอร์ด "${name}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ยืนยันลบ',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.delete(`/Ward/${id}`);
                Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
            }
        }
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>
        <Domain sx={{ mr: 1, verticalAlign: 'middle' }} /> 
        จัดการข้อมูลองค์กร
      </Typography>

      <Paper sx={{ width: '100%', mb: 4, borderRadius: 4, overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
          <Tab label="1. ข้อมูลโรงพยาบาล" icon={<Domain />} iconPosition="start" />
          <Tab label="2. ข้อมูลวอร์ด/แผนก" icon={<MeetingRoom />} iconPosition="start" />
        </Tabs>

        {/* --- Tab 1: Hospital --- */}
        <Box sx={{ p: 3, display: tabValue === 0 ? 'block' : 'none' }}>
           <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                  <TextField fullWidth label="ชื่อโรงพยาบาล" value={hospitalForm.name} onChange={e => setHospitalForm({...hospitalForm, name: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={4}>
                  <TextField fullWidth label="ที่อยู่/ติดต่อ" value={hospitalForm.address} onChange={e => setHospitalForm({...hospitalForm, address: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={4}>
                  <Button variant="contained" startIcon={<AddCircle />} onClick={handleAddHospital} fullWidth size="large">เพิ่มโรงพยาบาล</Button>
              </Grid>
           </Grid>

           <TableContainer component={Paper} elevation={0} variant="outlined">
             <Table>
               <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                 <TableRow>
                   <TableCell>ชื่อโรงพยาบาล</TableCell>
                   <TableCell>ที่อยู่</TableCell>
                   <TableCell align="center">แก้ไข/ลบ</TableCell>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {hospitals.map((h) => (
                   <TableRow key={h.hospitalId}>
                     <TableCell>{h.hospitalName}</TableCell>
                     <TableCell>{h.address || '-'}</TableCell>
                     <TableCell align="center">
                        <IconButton size="small" color="primary"><Edit /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteHospital(h.hospitalId, h.hospitalName)}><Delete /></IconButton>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </TableContainer>
        </Box>

        {/* --- Tab 2: Ward --- */}
        <Box sx={{ p: 3, display: tabValue === 1 ? 'block' : 'none' }}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>สังกัดโรงพยาบาล</InputLabel>
                    <Select value={wardForm.hospitalId} label="สังกัดโรงพยาบาล" onChange={e => setWardForm({...wardForm, hospitalId: e.target.value})}>
                        {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                    </Select>
                  </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                  <TextField fullWidth label="ชื่อวอร์ด / แผนก" value={wardForm.name} onChange={e => setWardForm({...wardForm, name: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={4}>
                  <Button variant="contained" startIcon={<AddCircle />} onClick={handleAddWard} fullWidth size="large">เพิ่มวอร์ด</Button>
              </Grid>
           </Grid>

           <TableContainer component={Paper} elevation={0} variant="outlined">
             <Table>
               <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                 <TableRow>
                   <TableCell>ชื่อวอร์ด</TableCell>
                   <TableCell>สังกัดโรงพยาบาล</TableCell>
                   <TableCell align="center">แก้ไข/ลบ</TableCell>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {wards.map((w) => (
                   <TableRow key={w.wardId}>
                     <TableCell>{w.wardName}</TableCell>
                     <TableCell>{w.hospital?.hospitalName || '-'}</TableCell>
                     <TableCell align="center">
                        <IconButton size="small" color="primary"><Edit /></IconButton>
                        {/* ✅ ปุ่มลบ ผูกกับฟังก์ชัน handleDeleteWard ที่มี SweetAlert */}
                        <IconButton size="small" color="error" onClick={() => handleDeleteWard(w.wardId, w.wardName)}>
                            <Delete />
                        </IconButton>
                     </TableCell>
                   </TableRow>
                 ))}
                 {wards.length === 0 && <TableRow><TableCell colSpan={3} align="center">ไม่มีข้อมูล</TableCell></TableRow>}
               </TableBody>
             </Table>
           </TableContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default HospitalPage;