import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
    Card, Chip, InputAdornment, Stack, CircularProgress, Tooltip, Alert
} from '@mui/material';
import {
    AddCircle, Delete, Domain, MeetingRoom, Edit, ListAlt, Apartment, CorporateFare
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

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

    // Forms
    const [hospitalForm, setHospitalForm] = useState({ name: '', address: '', contact: '' });
    const [wardForm, setWardForm] = useState({ name: '', hospitalId: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel Fetch with explicit error handling for each promise
            const [hospRes, wardRes] = await Promise.all([
                axiosClient.get('/Hospital').catch(err => { console.error("Hospital Fetch Error:", err); return { data: [] }; }),
                axiosClient.get('/Ward').catch(err => { console.error("Ward Fetch Error:", err); return { data: [] }; })
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
    };

    // --- Logic Hospital ---
    const handleAddHospital = async () => {
        if (!hospitalForm.name) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อโรงพยาบาล', 'warning');

        try {
            await axiosClient.post('/Hospital', {
                hospitalName: hospitalForm.name,
                address: hospitalForm.address,
                contactInfo: hospitalForm.contact
            });
            Swal.fire('สำเร็จ', 'เพิ่มโรงพยาบาลเรียบร้อย', 'success');

            // 🔔 Notify Admin
            await sendNotification("เพิ่มโรงพยาบาลใหม่", `โรงพยาบาล ${hospitalForm.name} ถูกเพิ่มเข้าสู่ระบบแล้ว`, "INFO", "/hospital", undefined, 1);

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
                    await sendNotification("ลบข้อมูลโรงพยาบาล", `ข้อมูลโรงพยาบาล ${name} ถูกลบออกจากระบบ`, "WARNING", "/hospital", undefined, 1);
                    fetchData();
                } catch (err) {
                    Swal.fire('Error', 'ลบไม่สำเร็จ (อาจมีข้อมูลอ้างอิงอยู่)', 'error');
                }
            }
        });
    };

    // --- Logic Ward ---
    const handleAddWard = async () => {
        if (!wardForm.name || !wardForm.hospitalId) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อวอร์ดและโรงพยาบาล', 'warning');

        try {
            await axiosClient.post('/Ward', {
                wardName: wardForm.name,
                hospitalId: parseInt(wardForm.hospitalId),
                isActive: true
            });
            Swal.fire('สำเร็จ', 'เพิ่มวอร์ดเรียบร้อย', 'success');

            const hospitalName = hospitals.find(h => h.hospitalId === parseInt(wardForm.hospitalId))?.hospitalName || 'ไม่ระบุ';
            await sendNotification("เพิ่มแผนก/วอร์ดใหม่", `แผนก ${wardForm.name} (สังกัด: ${hospitalName}) ถูกเพิ่มแล้ว`, "INFO", "/hospital", undefined, 1);

            setWardForm({ ...wardForm, name: '' });
            fetchData();
        } catch (err: any) {
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
            confirmButtonText: 'ยืนยันลบ',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axiosClient.delete(`/Ward/${id}`);
                    Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                    await sendNotification("ลบข้อมูลแผนก/วอร์ด", `ข้อมูลแผนก ${name} ถูกลบออกจากระบบ`, "WARNING", "/hospital", undefined, 1);
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
                        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
                                <AddCircle color="primary" fontSize="small" /> เพิ่มโรงพยาบาลใหม่
                            </Typography>
                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        label="ชื่อโรงพยาบาล"
                                        placeholder="ระบุชื่อโรงพยาบาล..."
                                        value={hospitalForm.name}
                                        onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><CorporateFare fontSize="small" color="action" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 5 }}>
                                    <TextField
                                        label="ที่อยู่ / ข้อมูลติดต่อ"
                                        placeholder="ที่อยู่ หรือ เบอร์โทรศัพท์..."
                                        value={hospitalForm.address}
                                        onChange={e => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddCircle />}
                                        onClick={handleAddHospital}
                                        fullWidth
                                        sx={{ borderRadius: 2, height: 40, boxShadow: 'none' }}
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
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>ชื่อโรงพยาบาล</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>ที่อยู่ / ติดต่อ</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#475569', width: 120 }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {hospitals?.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#94a3b8' }}>ยังไม่มีข้อมูลโรงพยาบาล</TableCell></TableRow>
                                        ) : hospitals?.map((h) => (
                                            <TableRow key={h.hospitalId} hover>
                                                <TableCell sx={{ fontWeight: 600, maxWidth: 250 }}>
                                                    <Tooltip title={h.hospitalName}>
                                                        <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#0f172a' }}>
                                                            {h.hospitalName}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ color: 'text.secondary', maxWidth: 350 }}>
                                                    <Tooltip title={h.address || 'ไม่มีข้อมูล'}>
                                                        <Typography variant="body2" noWrap>
                                                            {h.address || '-'}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <IconButton size="small" sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' }, borderRadius: 1 }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' }, borderRadius: 1 }}
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
                        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
                                <AddCircle color="primary" fontSize="small" /> เพิ่มวอร์ด / แผนกใหม่
                            </Typography>
                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <FormControl>
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
                                <Grid size={{ xs: 12, md: 5 }}>
                                    <TextField
                                        label="ชื่อวอร์ด / แผนก"
                                        placeholder="เช่น อายุรกรรม, ห้องฉุกเฉิน..."
                                        value={wardForm.name}
                                        onChange={e => setWardForm({ ...wardForm, name: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><MeetingRoom fontSize="small" color="action" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddCircle />}
                                        onClick={handleAddWard}
                                        fullWidth
                                        sx={{ borderRadius: 2, height: 40, boxShadow: 'none' }}
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
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>ชื่อวอร์ด / แผนก</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>สังกัดโรงพยาบาล</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#475569', width: 120 }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {wards?.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#94a3b8' }}>ยังไม่มีข้อมูลวอร์ด</TableCell></TableRow>
                                        ) : wards?.map((w) => (
                                            <TableRow key={w.wardId} hover>
                                                <TableCell sx={{ fontWeight: 600, maxWidth: 250 }}>
                                                    <Tooltip title={w.wardName}>
                                                        <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#0f172a' }}>
                                                            {w.wardName}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>
                                                    <Chip label={w.hospital?.hospitalName || '-'} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <IconButton size="small" sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' }, borderRadius: 1 }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' }, borderRadius: 1 }}
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