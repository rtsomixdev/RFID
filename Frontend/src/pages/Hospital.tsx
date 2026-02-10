import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
    Card, Chip, InputAdornment, Stack, CircularProgress, Alert, Tooltip
} from '@mui/material';
import {
    AddCircle, Delete, Domain, MeetingRoom, Edit, ListAlt, Apartment, CorporateFare, Save, Cancel
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios'; // ⚠️ ใช้ axios แทน axiosClient เพื่อ Fix Port
import { sendNotification } from '../utils/notificationUtil';

// ⚠️ Config URL (Port 5134)
const API_HOSPITAL = 'http://localhost:5134/api/Hospital';
const API_WARD = 'http://localhost:5134/api/Ward';

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
    // --- States ---
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    // Forms & Edit States
    const [hospitalForm, setHospitalForm] = useState({ name: '', address: '', contact: '' });
    const [editHospitalId, setEditHospitalId] = useState<number | null>(null); // ✅ เก็บ ID โรงพยาบาลที่กำลังแก้

    const [wardForm, setWardForm] = useState({ name: '', hospitalId: '' });
    const [editWardId, setEditWardId] = useState<number | null>(null); // ✅ เก็บ ID วอร์ดที่กำลังแก้

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel Fetch
            const [hospRes, wardRes] = await Promise.all([
                axios.get(API_HOSPITAL).catch(err => { console.error("Hospital Fetch Error:", err); return { data: [] }; }),
                axios.get(API_WARD).catch(err => { console.error("Ward Fetch Error:", err); return { data: [] }; })
            ]);

            setHospitals(hospRes.data || []);
            setWards(wardRes.data || []);
        } catch (err) {
            console.error("Global Fetch Error:", err);
            setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        // Reset Edit Mode เมื่อเปลี่ยน Tab กันงง
        handleCancelHospital();
        handleCancelWard();
    };

    // ================= HOSPITAL LOGIC =================

    // 1. กดแก้ไข (Edit)
    const handleEditHospital = (hospital: Hospital) => {
        setEditHospitalId(hospital.hospitalId);
        setHospitalForm({
            name: hospital.hospitalName,
            address: hospital.address || '',
            contact: hospital.contactInfo || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 2. ยกเลิก (Cancel)
    const handleCancelHospital = () => {
        setEditHospitalId(null);
        setHospitalForm({ name: '', address: '', contact: '' });
    };

    // 3. บันทึก (Submit)
    const handleSubmitHospital = async () => {
        if (!hospitalForm.name) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อโรงพยาบาล', 'warning');

        try {
            if (editHospitalId) {
                // 🟡 Update (PUT)
                await axios.put(`${API_HOSPITAL}/${editHospitalId}`, {
                    hospitalId: editHospitalId,
                    hospitalName: hospitalForm.name,
                    address: hospitalForm.address,
                    contactInfo: hospitalForm.contact
                });
                Swal.fire('แก้ไขสำเร็จ', 'ข้อมูลโรงพยาบาลถูกอัปเดตแล้ว', 'success');
                handleCancelHospital();
            } else {
                // 🟢 Create (POST)
                await axios.post(API_HOSPITAL, {
                    hospitalName: hospitalForm.name,
                    address: hospitalForm.address,
                    contactInfo: hospitalForm.contact
                });
                Swal.fire('สำเร็จ', 'เพิ่มโรงพยาบาลเรียบร้อย', 'success');
                
                await sendNotification("เพิ่มโรงพยาบาลใหม่", `โรงพยาบาล ${hospitalForm.name} เข้าระบบแล้ว`, "INFO", "/hospital", undefined, 1);
                handleCancelHospital(); // Reset Form
            }
            fetchData();
        } catch (err: any) {
            console.error(err);
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
            confirmButtonText: 'ยืนยันลบ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_HOSPITAL}/${id}`);
                    Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                    
                    await sendNotification("ลบโรงพยาบาล", `ข้อมูล ${name} ถูกลบแล้ว`, "WARNING", "/hospital", undefined, 1);
                    fetchData();
                } catch (err: any) {
                    const msg = err.response?.data?.message || 'ลบไม่สำเร็จ (อาจมีข้อมูลอ้างอิงอยู่)';
                    Swal.fire('Error', msg, 'error');
                }
            }
        });
    };

    // ================= WARD LOGIC =================

    // 1. กดแก้ไข (Edit)
    const handleEditWard = (ward: Ward) => {
        setEditWardId(ward.wardId);
        setWardForm({
            name: ward.wardName,
            hospitalId: ward.hospitalId.toString()
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 2. ยกเลิก (Cancel)
    const handleCancelWard = () => {
        setEditWardId(null);
        setWardForm({ name: '', hospitalId: '' });
    };

    // 3. บันทึก (Submit)
    const handleSubmitWard = async () => {
        if (!wardForm.name || !wardForm.hospitalId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อวอร์ดและโรงพยาบาล', 'warning');

        try {
            const payload = {
                wardId: editWardId || 0, // ถ้า create ไม่ต้องใช้, update ต้องใช้
                wardName: wardForm.name,
                hospitalId: parseInt(wardForm.hospitalId),
                isActive: true
            };

            if (editWardId) {
                // 🟡 Update (PUT)
                await axios.put(`${API_WARD}/${editWardId}`, payload);
                Swal.fire('แก้ไขสำเร็จ', 'ข้อมูลวอร์ดถูกอัปเดตแล้ว', 'success');
                handleCancelWard();
            } else {
                // 🟢 Create (POST)
                await axios.post(API_WARD, payload);
                Swal.fire('สำเร็จ', 'เพิ่มวอร์ดเรียบร้อย', 'success');
                
                const hospitalName = hospitals.find(h => h.hospitalId === parseInt(wardForm.hospitalId))?.hospitalName;
                await sendNotification("เพิ่มแผนกใหม่", `แผนก ${wardForm.name} (${hospitalName}) เข้าระบบแล้ว`, "INFO", "/hospital", undefined, 1);
                
                handleCancelWard(); // Reset Form
            }
            fetchData();
        } catch (err: any) {
            console.error(err);
            Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error');
        }
    };

    const handleDeleteWard = (id: number, name: string) => {
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: `ต้องการลบวอร์ด "${name}" หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ยืนยันลบ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_WARD}/${id}`);
                    Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                    
                    await sendNotification("ลบแผนก", `ข้อมูล ${name} ถูกลบแล้ว`, "WARNING", "/hospital", undefined, 1);
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
                }
            }
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
                <CircularProgress size={50} thickness={4} />
                <Typography color="textSecondary">กำลังโหลดข้อมูล...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
                    {error} <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>ลองใหม่</Button>
                </Alert>
            </Box>
        );
    }

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
            <Card sx={{ mb: 4, overflow: 'hidden' }}>
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
                        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: editHospitalId ? '#fffbeb' : '#fff' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: editHospitalId ? '#d97706' : '#334155' }}>
                                {editHospitalId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />} 
                                {editHospitalId ? 'แก้ไขข้อมูลโรงพยาบาล' : 'เพิ่มโรงพยาบาลใหม่'}
                            </Typography>
                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="ชื่อโรงพยาบาล"
                                        placeholder="ระบุชื่อโรงพยาบาล..."
                                        value={hospitalForm.name}
                                        onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><CorporateFare fontSize="small" color="action" /></InputAdornment> }}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        label="ที่อยู่ / ข้อมูลติดต่อ"
                                        placeholder="ที่อยู่ หรือ เบอร์โทรศัพท์..."
                                        value={hospitalForm.address}
                                        onChange={e => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
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
                                        <Button variant="contained" startIcon={<AddCircle />} onClick={handleSubmitHospital} fullWidth sx={{ borderRadius: 2, height: 40 }}>
                                            เพิ่มข้อมูล
                                        </Button>
                                    )}
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
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>ชื่อโรงพยาบาล</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>ที่อยู่ / ติดต่อ</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {hospitals?.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#94a3b8' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                                        ) : hospitals?.map((h) => (
                                            <TableRow key={h.hospitalId} hover selected={editHospitalId === h.hospitalId}>
                                                <TableCell sx={{ fontWeight: 600, maxWidth: 250 }}>{h.hospitalName}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary', maxWidth: 350 }}>{h.address || '-'}</TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditHospital(h)}
                                                            sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}
                                                        >
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
                        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: editWardId ? '#fffbeb' : '#fff' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: editWardId ? '#d97706' : '#334155' }}>
                                {editWardId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />} 
                                {editWardId ? 'แก้ไขข้อมูลวอร์ด' : 'เพิ่มวอร์ด / แผนกใหม่'}
                            </Typography>
                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>สังกัดโรงพยาบาล</InputLabel>
                                        <Select
                                            value={wardForm.hospitalId}
                                            label="สังกัดโรงพยาบาล"
                                            onChange={e => setWardForm({ ...wardForm, hospitalId: e.target.value })}
                                            startAdornment={<InputAdornment position="start"><Domain fontSize="small" color="action" /></InputAdornment>}
                                        >
                                            {hospitals?.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        label="ชื่อวอร์ด / แผนก"
                                        placeholder="เช่น อายุรกรรม, ห้องฉุกเฉิน..."
                                        value={wardForm.name}
                                        onChange={e => setWardForm({ ...wardForm, name: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><MeetingRoom fontSize="small" color="action" /></InputAdornment> }}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
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
                                        <Button variant="contained" startIcon={<AddCircle />} onClick={handleSubmitWard} fullWidth sx={{ borderRadius: 2, height: 40 }}>
                                            เพิ่มข้อมูล
                                        </Button>
                                    )}
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
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>ชื่อวอร์ด / แผนก</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>สังกัดโรงพยาบาล</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {wards?.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#94a3b8' }}>ยังไม่มีข้อมูล</TableCell></TableRow>
                                        ) : wards?.map((w) => (
                                            <TableRow key={w.wardId} hover selected={editWardId === w.wardId}>
                                                <TableCell sx={{ fontWeight: 600, maxWidth: 250 }}>{w.wardName}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>
                                                    <Chip label={w.hospital?.hospitalName || '-'} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditWard(w)}
                                                            sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}
                                                        >
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