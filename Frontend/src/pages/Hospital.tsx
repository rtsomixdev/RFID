import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tabs, Tab, Select, MenuItem,
  Chip, InputAdornment, Stack, CircularProgress, Alert,
  useTheme, alpha
} from '@mui/material';
import {
  AddCircle, Delete, Domain, MeetingRoom, Edit, ListAlt, Apartment, CorporateFare, Save, Cancel,
  Business, LocalHospital
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

const API_BASE_URL = 'http://localhost:5134/api';
const API_HOSPITAL = `${API_BASE_URL}/Hospital`;
const API_WARD = `${API_BASE_URL}/Ward`;

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

  // ✅ การเช็คสิทธิ์แบบละเอียด
  const userStr = localStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const permissions = currentUser?.permissions || currentUser?.Permissions || [];
  const roleId = currentUser?.roleId || currentUser?.RoleId || 0;
  
  // เช็คว่ามีสิทธิ์เขียน(เพิ่ม), แก้ไข, ลบ หรือไม่
  const canWrite = roleId === 1 || permissions.includes('WRITE_HOSPITAL');
  const canEdit = roleId === 1 || permissions.includes('EDIT_HOSPITAL');
  const canDelete = roleId === 1 || permissions.includes('DELETE_HOSPITAL');

  // --- States ---
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [hospitalForm, setHospitalForm] = useState({ name: '', address: '', contact: '' });
  const [editHospitalId, setEditHospitalId] = useState<number | null>(null);

  const [wardForm, setWardForm] = useState({ name: '', hospitalId: '' });
  const [editWardId, setEditWardId] = useState<number | null>(null);

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
      Swal.fire({ icon: 'error', title: 'Session หมดอายุ', text: 'กรุณาเข้าสู่ระบบใหม่', timer: 2000, showConfirmButton: false }).then(() => { navigate('/login'); });
    } else {
      Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setHospitalForm({ name: hospital.hospitalName, address: hospital.address || '', contact: hospital.contactInfo || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelHospital = () => {
    setEditHospitalId(null);
    setHospitalForm({ name: '', address: '', contact: '' });
  };

  const handleSubmitHospital = async () => {
    if (!hospitalForm.name) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อโรงพยาบาล', 'warning');
    try {
      const payload = { hospitalId: editHospitalId || 0, hospitalName: hospitalForm.name, address: hospitalForm.address, contactInfo: hospitalForm.contact };
      if (editHospitalId) {
        await axios.put(`${API_HOSPITAL}/${editHospitalId}`, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', showConfirmButton: false, timer: 1500 });
      } else {
        await axios.post(API_HOSPITAL, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'สำเร็จ', showConfirmButton: false, timer: 1500 });
        await sendNotification("เพิ่มโรงพยาบาลใหม่", `โรงพยาบาล ${hospitalForm.name} เข้าระบบแล้ว`, "INFO", "/hospital", undefined, 1);
      }
      handleCancelHospital();
      fetchData();
    } catch (err) { handleApiError(err); }
  };

  const handleDeleteHospital = (id: number, name: string) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', text: `ต้องการลบโรงพยาบาล "${name}" หรือไม่? ข้อมูลวอร์ดที่เกี่ยวข้องอาจถูกลบด้วย`, icon: 'warning', showCancelButton: true, confirmButtonColor: theme.palette.error.main, confirmButtonText: 'ยืนยันลบ'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_HOSPITAL}/${id}`, getAuthConfig());
          Swal.fire({ icon: 'success', title: 'ลบแล้ว', showConfirmButton: false, timer: 1500 });
          fetchData();
        } catch (err) { handleApiError(err); }
      }
    });
  };

  // ================= WARD LOGIC =================
  const handleEditWard = (ward: Ward) => {
    setEditWardId(ward.wardId);
    setWardForm({ name: ward.wardName, hospitalId: ward.hospitalId.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelWard = () => {
    setEditWardId(null);
    setWardForm({ name: '', hospitalId: '' });
  };

  const handleSubmitWard = async () => {
    if (!wardForm.name || !wardForm.hospitalId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อวอร์ดและโรงพยาบาล', 'warning');
    try {
      const payload = { wardId: editWardId || 0, wardName: wardForm.name, hospitalId: parseInt(wardForm.hospitalId), isActive: true };
      if (editWardId) {
        await axios.put(`${API_WARD}/${editWardId}`, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', showConfirmButton: false, timer: 1500 });
      } else {
        await axios.post(API_WARD, payload, getAuthConfig());
        Swal.fire({ icon: 'success', title: 'สำเร็จ', showConfirmButton: false, timer: 1500 });
      }
      handleCancelWard();
      fetchData();
    } catch (err) { handleApiError(err); }
  };

  const handleDeleteWard = (id: number, name: string) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', text: `ต้องการลบวอร์ด "${name}" หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: theme.palette.error.main, confirmButtonText: 'ยืนยันลบ'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_WARD}/${id}`, getAuthConfig());
          Swal.fire({ icon: 'success', title: 'ลบแล้ว', showConfirmButton: false, timer: 1500 });
          fetchData();
        } catch (err) { handleApiError(err); }
      }
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error} <Button onClick={fetchData}>ลองใหม่</Button></Alert></Box>;

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="จัดการข้อมูลองค์กร"
        subtitle="บริหารจัดการข้อมูลโรงพยาบาลและแผนก/วอร์ด"
        icon={<Domain fontSize="large" />}
        breadcrumbs={[{ label: 'หน้าหลัก', href: '/' }, { label: 'จัดการข้อมูล' }, { label: 'โรงพยาบาล' }]}
      />

      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ minHeight: 48, '& .MuiTabs-indicator': { display: 'none' }, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 50, '&.Mui-selected': { bgcolor: '#fff', color: theme.palette.primary.main, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } } }}>
          <Tab label="ข้อมูลโรงพยาบาล" icon={<Apartment fontSize="small" />} iconPosition="start" />
          <Tab label="ข้อมูลวอร์ด/แผนก" icon={<MeetingRoom fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* --- Tab 1: Hospital Content --- */}
      <Paper variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: tabValue === 0 ? 'block' : 'none' }}>
        
        {/* ซ่อนฟอร์มสร้าง/แก้ไข ถ้าไม่มีสิทธิ์ */}
        {(canWrite || (editHospitalId && canEdit)) && (
          <Box sx={{ p: 4, bgcolor: editHospitalId ? alpha(theme.palette.warning.light, 0.05) : '#fff', borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: editHospitalId ? theme.palette.warning.dark : theme.palette.primary.dark }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: editHospitalId ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {editHospitalId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />}
              </Box>
              {editHospitalId ? 'แก้ไขข้อมูลโรงพยาบาล' : 'เพิ่มโรงพยาบาลใหม่'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}><FormLabel label="ชื่อโรงพยาบาล" required><TextField placeholder="ระบุชื่อโรงพยาบาล..." value={hospitalForm.name} onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })} fullWidth /></FormLabel></Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}><FormLabel label="ที่อยู่ / ข้อมูลติดต่อ"><TextField placeholder="ที่อยู่ หรือ เบอร์โทรศัพท์..." value={hospitalForm.address} onChange={e => setHospitalForm({ ...hospitalForm, address: e.target.value })} fullWidth /></FormLabel></Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' }, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                {editHospitalId ? (
                  <>
                    <Button variant="contained" color="warning" onClick={handleSubmitHospital} fullWidth>บันทึก</Button>
                    <Button variant="outlined" color="inherit" onClick={handleCancelHospital} fullWidth>ยกเลิก</Button>
                  </>
                ) : (
                  <Button variant="contained" onClick={handleSubmitHospital} fullWidth>เพิ่มข้อมูล</Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}><ListAlt /> รายชื่อโรงพยาบาล</Typography>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
              <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}><TableCell>ชื่อโรงพยาบาล</TableCell><TableCell>ที่อยู่</TableCell><TableCell align="center">จัดการ</TableCell></TableRow></TableHead>
              <TableBody>
                {hospitals.map((h) => (
                  <TableRow key={h.hospitalId} hover>
                    <TableCell><Typography fontWeight={600} variant="body2">{h.hospitalName}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{h.address || '-'}</Typography></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {canEdit && <IconButton size="small" onClick={() => handleEditHospital(h)} sx={{ color: theme.palette.primary.main }}><Edit fontSize="small" /></IconButton>}
                        {canDelete && <IconButton size="small" onClick={() => handleDeleteHospital(h.hospitalId, h.hospitalName)} sx={{ color: theme.palette.error.main }}><Delete fontSize="small" /></IconButton>}
                        {!canEdit && !canDelete && <Typography variant="caption" color="text.disabled">-</Typography>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* --- Tab 2: Ward Content --- */}
      <Paper variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: tabValue === 1 ? 'block' : 'none' }}>
        
        {/* ซ่อนฟอร์มสร้าง/แก้ไข ถ้าไม่มีสิทธิ์ */}
        {(canWrite || (editWardId && canEdit)) && (
          <Box sx={{ p: 4, bgcolor: editWardId ? alpha(theme.palette.warning.light, 0.05) : '#fff', borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: editWardId ? theme.palette.warning.dark : theme.palette.primary.dark }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: editWardId ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {editWardId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />}
              </Box>
              {editWardId ? 'แก้ไขข้อมูลวอร์ด / แผนก' : 'เพิ่มวอร์ด / แผนกใหม่'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <FormLabel label="สังกัดโรงพยาบาล" required>
                  <Select value={wardForm.hospitalId} onChange={e => setWardForm({ ...wardForm, hospitalId: e.target.value })} fullWidth displayEmpty>
                    <MenuItem value="" disabled>เลือกโรงพยาบาล</MenuItem>
                    {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                  </Select>
                </FormLabel>
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                <FormLabel label="ชื่อวอร์ด / แผนก" required><TextField placeholder="เช่น อายุรกรรม..." value={wardForm.name} onChange={e => setWardForm({ ...wardForm, name: e.target.value })} fullWidth /></FormLabel>
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' }, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                {editWardId ? (
                  <>
                    <Button variant="contained" color="warning" onClick={handleSubmitWard} fullWidth>บันทึก</Button>
                    <Button variant="outlined" color="inherit" onClick={handleCancelWard} fullWidth>ยกเลิก</Button>
                  </>
                ) : (
                  <Button variant="contained" onClick={handleSubmitWard} fullWidth>เพิ่มข้อมูล</Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ p: 4 }}>
          <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}><ListAlt /> รายชื่อแผนก</Typography>
          <TableContainer component={Paper} elevation={0} variant="outlined">
            <Table>
              <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}><TableCell>ชื่อวอร์ด / แผนก</TableCell><TableCell>สังกัดโรงพยาบาล</TableCell><TableCell align="center">จัดการ</TableCell></TableRow></TableHead>
              <TableBody>
                {wards.map((w) => (
                  <TableRow key={w.wardId} hover>
                    <TableCell><Typography fontWeight={600} variant="body2">{w.wardName}</Typography></TableCell>
                    <TableCell><Chip label={w.hospital?.hospitalName || 'Unknown'} size="small" variant="outlined" /></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {canEdit && <IconButton size="small" onClick={() => handleEditWard(w)} sx={{ color: theme.palette.primary.main }}><Edit fontSize="small" /></IconButton>}
                        {canDelete && <IconButton size="small" onClick={() => handleDeleteWard(w.wardId, w.wardName)} sx={{ color: theme.palette.error.main }}><Delete fontSize="small" /></IconButton>}
                        {!canEdit && !canDelete && <Typography variant="caption" color="text.disabled">-</Typography>}
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
  );
};

export default HospitalPage;