import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tabs, Tab, Select, MenuItem, FormControl,
  Card, Chip, InputAdornment, Stack, CircularProgress, Alert,
  Divider, CardContent, CardActions, useTheme, alpha
} from '@mui/material';
import {
  AddCircle, Delete, Domain, MeetingRoom, Edit, ListAlt, Apartment, CorporateFare, Save, Cancel,
  Business, LocalHospital, KeyboardArrowRight
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// ⚠️ Config URL
const API_BASE_URL = 'http://localhost:5134/api';
const API_HOSPITAL = `${API_BASE_URL}/Hospital`;
const API_WARD = `${API_BASE_URL}/Ward`;

// --- Types ---
interface Hospital {
  hospitalId: number;
  hospitalName: string;
  address?: string;
  contactInfo?: string;
}

interface Ward {
  wardId: number;
  wardName: string;
  hospitalId: number;
  hospital?: Hospital;
  isActive: boolean;
}

const HospitalPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // --- States ---
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // Forms & Edit States
  const [hospitalForm, setHospitalForm] = useState({ name: '', address: '', contact: '' });
  const [editHospitalId, setEditHospitalId] = useState<number | null>(null);

  const [wardForm, setWardForm] = useState({ name: '', hospitalId: '' });
  const [editWardId, setEditWardId] = useState<number | null>(null);

  // ✅ Auth Config
  const getAuthConfig = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const handleApiError = (err: any) => {
    console.error("API Error:", err);
    if (err.response && err.response.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Session หมดอายุ',
        text: 'กรุณาเข้าสู่ระบบใหม่',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/login');
      });
    } else {
      Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [hospRes, wardRes] = await Promise.all([
        axios.get(API_HOSPITAL, getAuthConfig()),
        axios.get(API_WARD, getAuthConfig())
      ]);

      setHospitals(hospRes.data || []);
      setWards(wardRes.data || []);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Session หมดอายุ กรุณา Login ใหม่");
      } else {
        console.error("Fetch Error:", err);
        setError("ไม่สามารถโหลดข้อมูลได้ ตรวจสอบว่า Backend เปิดอยู่หรือไม่");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    handleCancelHospital();
    handleCancelWard();
  };

  // ================= HOSPITAL LOGIC =================

  const handleEditHospital = (hospital: Hospital) => {
    setEditHospitalId(hospital.hospitalId);
    setHospitalForm({
      name: hospital.hospitalName,
      address: hospital.address || '',
      contact: hospital.contactInfo || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelHospital = () => {
    setEditHospitalId(null);
    setHospitalForm({ name: '', address: '', contact: '' });
  };

  const handleSubmitHospital = async () => {
    if (!hospitalForm.name) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อโรงพยาบาล', 'warning');

    try {
      const payload = {
        hospitalId: editHospitalId || 0,
        hospitalName: hospitalForm.name,
        address: hospitalForm.address,
        contactInfo: hospitalForm.contact
      };

      if (editHospitalId) {
        await axios.put(`${API_HOSPITAL}/${editHospitalId}`, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', text: 'ข้อมูลโรงพยาบาลถูกอัปเดตแล้ว', showConfirmButton: false, timer: 1500 });
      } else {
        await axios.post(API_HOSPITAL, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เพิ่มโรงพยาบาลเรียบร้อย', showConfirmButton: false, timer: 1500 });

        await sendNotification("เพิ่มโรงพยาบาลใหม่", `โรงพยาบาล ${hospitalForm.name} เข้าระบบแล้ว`, "INFO", "/hospital", undefined, 1);
      }

      handleCancelHospital();
      fetchData();
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDeleteHospital = (id: number, name: string) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบโรงพยาบาล "${name}" หรือไม่? ข้อมูลวอร์ดที่เกี่ยวข้องอาจถูกลบด้วย`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.text.secondary,
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_HOSPITAL}/${id}`, getAuthConfig());
          Swal.fire({ icon: 'success', title: 'ลบแล้ว', text: 'ข้อมูลถูกลบเรียบร้อย', showConfirmButton: false, timer: 1500 });

          await sendNotification("ลบโรงพยาบาล", `ข้อมูล ${name} ถูกลบแล้ว`, "WARNING", "/hospital", undefined, 1);
          fetchData();
        } catch (err) {
          handleApiError(err);
        }
      }
    });
  };

  // ================= WARD LOGIC =================

  const handleEditWard = (ward: Ward) => {
    setEditWardId(ward.wardId);
    setWardForm({
      name: ward.wardName,
      hospitalId: ward.hospitalId.toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelWard = () => {
    setEditWardId(null);
    setWardForm({ name: '', hospitalId: '' });
  };

  const handleSubmitWard = async () => {
    if (!wardForm.name || !wardForm.hospitalId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อวอร์ดและโรงพยาบาล', 'warning');

    try {
      const payload = {
        wardId: editWardId || 0,
        wardName: wardForm.name,
        hospitalId: parseInt(wardForm.hospitalId),
        isActive: true
      };

      if (editWardId) {
        await axios.put(`${API_WARD}/${editWardId}`, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', text: 'ข้อมูลวอร์ดถูกอัปเดตแล้ว', showConfirmButton: false, timer: 1500 });
      } else {
        await axios.post(API_WARD, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เพิ่มวอร์ดเรียบร้อย', showConfirmButton: false, timer: 1500 });

        const hospitalName = hospitals.find(h => h.hospitalId === parseInt(wardForm.hospitalId))?.hospitalName;
        await sendNotification("เพิ่มแผนกใหม่", `แผนก ${wardForm.name} (${hospitalName}) เข้าระบบแล้ว`, "INFO", "/hospital", undefined, 1);
      }

      handleCancelWard();
      fetchData();
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDeleteWard = (id: number, name: string) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบวอร์ด "${name}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: theme.palette.text.secondary,
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_WARD}/${id}`, getAuthConfig());
          Swal.fire({ icon: 'success', title: 'ลบแล้ว', text: 'ข้อมูลถูกลบเรียบร้อย', showConfirmButton: false, timer: 1500 });

          await sendNotification("ลบแผนก", `ข้อมูล ${name} ถูกลบแล้ว`, "WARNING", "/hospital", undefined, 1);
          fetchData();
        } catch (err) {
          handleApiError(err);
        }
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography color="textSecondary" variant="body2">กำลังโหลดข้อมูล...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600, boxShadow: 2, borderRadius: 2 }}>
          {error} <Button size="small" onClick={fetchData} sx={{ ml: 2, fontWeight: 'bold' }}>ลองใหม่</Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 5 }}>
      {/* 1. Page Header */}
      <PageHeader
        title="จัดการข้อมูลองค์กร"
        subtitle="บริหารจัดการข้อมูลโรงพยาบาลและแผนก/วอร์ด"
        icon={<Domain fontSize="large" />}
        breadcrumbs={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'จัดการข้อมูล', href: '' },
          { label: 'โรงพยาบาล' }
        ]}
      />

      {/* 2. Tabs */}
      <Card sx={{ mb: 4, overflow: 'visible', border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            minHeight: 56,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              mr: 1,
              bgcolor: '#fff',
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${theme.palette.divider}`,
              borderBottom: 'none',
              '&.Mui-selected': { bgcolor: '#fff', color: theme.palette.primary.main, borderTop: `2px solid ${theme.palette.primary.main}` }
            },
            '& .MuiTabs-indicator': { display: 'none' } // Hide default indicator for card-tab look
          }}
        >
          <Tab label="1. ข้อมูลโรงพยาบาล" icon={<Apartment fontSize="small" />} iconPosition="start" />
          <Tab label="2. ข้อมูลวอร์ด/แผนก" icon={<MeetingRoom fontSize="small" />} iconPosition="start" />
        </Tabs>

        {/* --- Tab 1: Hospital Content --- */}
        <Card sx={{ mt: -0.2, borderRadius: '0 12px 12px 12px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>

            {/* Form Section */}
            <Box sx={{ p: 4, bgcolor: editHospitalId ? alpha(theme.palette.warning.light, 0.05) : '#fff', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: editHospitalId ? theme.palette.warning.dark : theme.palette.primary.dark }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  bgcolor: editHospitalId ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: editHospitalId ? theme.palette.warning.main : theme.palette.primary.main
                }}>
                  {editHospitalId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />}
                </Box>
                {editHospitalId ? 'แก้ไขข้อมูลโรงพยาบาล' : 'เพิ่มโรงพยาบาลใหม่'}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormLabel label="ชื่อโรงพยาบาล" required>
                    <TextField
                      placeholder="ระบุชื่อโรงพยาบาล..."
                      value={hospitalForm.name}
                      onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><CorporateFare fontSize="small" color="action" /></InputAdornment>
                      }}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormLabel label="ที่อยู่ / ข้อมูลติดต่อ">
                    <TextField
                      placeholder="ที่อยู่ หรือ เบอร์โทรศัพท์..."
                      value={hospitalForm.address}
                      onChange={e => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  {editHospitalId ? (
                    <>
                      <Button variant="contained" color="warning" startIcon={<Save />} onClick={handleSubmitHospital} fullWidth>
                        บันทึก
                      </Button>
                      <Button variant="outlined" color="inherit" startIcon={<Cancel />} onClick={handleCancelHospital} fullWidth>
                        ยกเลิก
                      </Button>
                    </>
                  ) : (
                    <Button variant="contained" startIcon={<AddCircle />} onClick={handleSubmitHospital} fullWidth>
                      เพิ่มข้อมูลใหม่
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Table Section */}
            <Box sx={{ p: 4 }}>
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ListAlt fontSize="medium" color="disabled" /> รายชื่อโรงพยาบาล ({hospitals.length})
                </Typography>
                <TextField
                  size="small"
                  placeholder="ค้นหา..."
                  sx={{ width: 250 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LocalHospital fontSize="small" /></InputAdornment> }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                      <TableCell width="35%">ชื่อโรงพยาบาล</TableCell>
                      <TableCell width="45%">ที่อยู่ / ติดต่อ</TableCell>
                      <TableCell width="20%" align="center">จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hospitals.length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.disabled' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                    ) : hospitals.map((h) => (
                      <TableRow key={h.hospitalId} hover selected={editHospitalId === h.hospitalId}>
                        <TableCell>
                          <Typography fontWeight={600} variant="body2">{h.hospitalName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap>{h.address || '-'}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleEditHospital(h)}
                              sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteHospital(h.hospitalId, h.hospitalName)}
                              sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) } }}
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
            <Box sx={{ p: 4, bgcolor: editWardId ? alpha(theme.palette.warning.light, 0.05) : '#fff', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: editWardId ? theme.palette.warning.dark : theme.palette.primary.dark }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  bgcolor: editWardId ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: editWardId ? theme.palette.warning.main : theme.palette.primary.main
                }}>
                  {editWardId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />}
                </Box>
                {editWardId ? 'แก้ไขข้อมูลวอร์ด / แผนก' : 'เพิ่มวอร์ด / แผนกใหม่'}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormLabel label="สังกัดโรงพยาบาล" required>
                    <Select
                      value={wardForm.hospitalId}
                      displayEmpty
                      onChange={e => setWardForm({ ...wardForm, hospitalId: e.target.value })}
                      startAdornment={<InputAdornment position="start"><Domain fontSize="small" color="action" /></InputAdornment>}
                    >
                      <MenuItem value="" disabled>เลือกโรงพยาบาล</MenuItem>
                      {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                    </Select>
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormLabel label="ชื่อวอร์ด / แผนก" required>
                    <TextField
                      placeholder="เช่น อายุรกรรม, ห้องฉุกเฉิน..."
                      value={wardForm.name}
                      onChange={e => setWardForm({ ...wardForm, name: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><MeetingRoom fontSize="small" color="action" /></InputAdornment> }}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  {editWardId ? (
                    <>
                      <Button variant="contained" color="warning" startIcon={<Save />} onClick={handleSubmitWard} fullWidth>
                        บันทึก
                      </Button>
                      <Button variant="outlined" color="inherit" startIcon={<Cancel />} onClick={handleCancelWard} fullWidth>
                        ยกเลิก
                      </Button>
                    </>
                  ) : (
                    <Button variant="contained" startIcon={<AddCircle />} onClick={handleSubmitWard} fullWidth>
                      เพิ่มข้อมูลใหม่
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ p: 4 }}>
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ListAlt fontSize="medium" color="disabled" /> รายชื่อแผนก ({wards.length})
                </Typography>
              </Box>

              <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                      <TableCell width="35%">ชื่อวอร์ด / แผนก</TableCell>
                      <TableCell width="45%">สังกัดโรงพยาบาล</TableCell>
                      <TableCell width="20%" align="center">จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wards.length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.disabled' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                    ) : wards.map((w) => (
                      <TableRow key={w.wardId} hover selected={editWardId === w.wardId}>
                        <TableCell>
                          <Typography fontWeight={600} variant="body2">{w.wardName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={w.hospital?.hospitalName || 'Unknown'} size="small" variant="outlined" icon={<Business />} />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleEditWard(w)}
                              sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteWard(w.wardId, w.wardName)}
                              sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) } }}
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
        </Card>
      </Card>
    </Box>
  );
};

export default HospitalPage;