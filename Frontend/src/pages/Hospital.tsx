import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
  Card, CardContent, Chip, InputAdornment, Stack
} from '@mui/material';
import { 
  AddCircle, Delete, Domain, MeetingRoom, Edit, ListAlt, Apartment, CorporateFare
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

  // ฟังก์ชันลบวอร์ด (SweetAlert Integration)
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
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
            <Domain fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                จัดการข้อมูลองค์กร
            </Typography>
            <Typography variant="body2" color="textSecondary">
                บริหารจัดการข้อมูลโรงพยาบาลและแผนก/วอร์ด
            </Typography>
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Card sx={{ mb: 4, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}
            textColor="primary"
            indicatorColor="primary"
        >
          <Tab label="1. ข้อมูลโรงพยาบาล" icon={<Apartment />} iconPosition="start" sx={{ minHeight: 64, fontWeight: 'bold' }} />
          <Tab label="2. ข้อมูลวอร์ด/แผนก" icon={<MeetingRoom />} iconPosition="start" sx={{ minHeight: 64, fontWeight: 'bold' }} />
        </Tabs>

        <Box sx={{ p: 0 }}>
            {/* --- Tab 1: Hospital Content --- */}
            <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>
                {/* Form Section */}
                <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
                        <AddCircle color="primary" fontSize="small" /> เพิ่มโรงพยาบาลใหม่
                    </Typography>
                    <Grid container spacing={3} alignItems="flex-start">
                        <Grid item xs={12} md={4}>
                            <TextField 
                                fullWidth size="small" 
                                label="ชื่อโรงพยาบาล" 
                                value={hospitalForm.name} 
                                onChange={e => setHospitalForm({...hospitalForm, name: e.target.value})} 
                                InputProps={{ startAdornment: <InputAdornment position="start"><CorporateFare fontSize="small" color="action"/></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <TextField 
                                fullWidth size="small" 
                                label="ที่อยู่ / ข้อมูลติดต่อ" 
                                value={hospitalForm.address} 
                                onChange={e => setHospitalForm({...hospitalForm, address: e.target.value})} 
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button 
                                variant="contained" 
                                startIcon={<AddCircle />} 
                                onClick={handleAddHospital} 
                                fullWidth 
                                sx={{ borderRadius: 2, height: 40 }}
                            >
                                เพิ่มข้อมูล
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {/* Table Section */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ListAlt fontSize="small" /> รายชื่อโรงพยาบาลในระบบ
                        </Typography>
                        <Chip label={`${hospitals.length} แห่ง`} size="small" color="primary" variant="outlined" />
                    </Box>
                    
                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อโรงพยาบาล</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ที่อยู่ / ติดต่อ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>จัดการ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {hospitals.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                                ) : hospitals.map((h) => (
                                    <TableRow key={h.hospitalId} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{h.hospitalName}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>{h.address || '-'}</TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <IconButton size="small" sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                                                    onClick={() => handleDeleteHospital(h.hospitalId, h.hospitalName)}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            {/* --- Tab 2: Ward Content --- */}
            <Box sx={{ display: tabValue === 1 ? 'block' : 'none' }}>
                {/* Form Section */}
                <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
                        <AddCircle color="primary" fontSize="small" /> เพิ่มวอร์ด / แผนกใหม่
                    </Typography>
                    <Grid container spacing={3} alignItems="flex-start">
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>สังกัดโรงพยาบาล</InputLabel>
                                <Select 
                                    value={wardForm.hospitalId} 
                                    label="สังกัดโรงพยาบาล" 
                                    onChange={e => setWardForm({...wardForm, hospitalId: e.target.value})}
                                    startAdornment={<InputAdornment position="start"><Domain fontSize="small" color="action"/></InputAdornment>}
                                >
                                    {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <TextField 
                                fullWidth size="small" 
                                label="ชื่อวอร์ด / แผนก" 
                                value={wardForm.name} 
                                onChange={e => setWardForm({...wardForm, name: e.target.value})} 
                                InputProps={{ startAdornment: <InputAdornment position="start"><MeetingRoom fontSize="small" color="action"/></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button 
                                variant="contained" 
                                startIcon={<AddCircle />} 
                                onClick={handleAddWard} 
                                fullWidth 
                                sx={{ borderRadius: 2, height: 40 }}
                            >
                                เพิ่มข้อมูล
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {/* Table Section */}
                <Box sx={{ p: 3 }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ListAlt fontSize="small" /> รายชื่อวอร์ดทั้งหมด
                        </Typography>
                        <Chip label={`${wards.length} แผนก`} size="small" color="primary" variant="outlined" />
                    </Box>

                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อวอร์ด / แผนก</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>สังกัดโรงพยาบาล</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>จัดการ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {wards.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                                ) : wards.map((w) => (
                                    <TableRow key={w.wardId} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{w.wardName}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>
                                            <Chip label={w.hospital?.hospitalName || '-'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <IconButton size="small" sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                                                    onClick={() => handleDeleteWard(w.wardId, w.wardName)}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default HospitalPage;