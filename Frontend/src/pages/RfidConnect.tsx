import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, Tabs, Tab, FormControl, InputLabel,
    Select, MenuItem, Chip, InputAdornment, Alert, Tooltip, Stack
} from '@mui/material';
import {
    SettingsRemote, Tag, AddCircle, Delete, Edit, Save,
    Router, Place, AutoFixHigh, Update, SettingsInputComponent
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';

// ⚠️ URL Backend (ถ้าใช้ axiosClient ให้เปลี่ยนตรงนี้เป็น axiosClient แทน)
const BASE_URL = 'http://localhost:5134/api';

// --- Types ---
interface Reader {
    readerId: number;
    readerName: string;
    ipAddress: string;
    locationId?: number; // Optional เพราะบางทีอาจส่งมาเป็น location string
    location?: string | { wardId: number; wardName: string };
    readerFunction?: string;
    isActive?: boolean;
    currentMode?: string;
    status?: string; // Online/Offline
}

interface SpecialTag {
    tagId: number;
    rfidCode: string;
    actionType: string;
    description: string;
}

const RfidConnect: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    // --- States for Readers ---
    const [readers, setReaders] = useState<Reader[]>([]);
    const [wards, setWards] = useState<any[]>([]); // สมมติว่ามี API ดึง Ward (ถ้าไม่มีให้ Mock หรือลบส่วน locationId ออก)

    // State สำหรับ Form Reader
    const [readerForm, setReaderForm] = useState({ 
        name: '', 
        ip: '', 
        location: '', // เปลี่ยนจาก locationId เป็น location text ธรรมดาเพื่อความง่าย (หรือจะใช้ dropdown เหมือนเดิมก็ได้)
        func: 'CHECK' 
    });
    const [isEditingReader, setIsEditingReader] = useState(false);
    const [editingReaderId, setEditingReaderId] = useState<number | null>(null);

    // --- States for Special Tags ---
    const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);
    const [tagForm, setTagForm] = useState({ rfid: '', action: '', desc: '' });
    const rfidInputRef = useRef<HTMLInputElement>(null);

    // --- Action Options ---
    const actionOptions = [
        { value: 'SET_STATUS_INFECTED', label: 'ผ้าติดเชื้อ (Infected)', color: '#dc2626' },
        { value: 'SET_STATUS_REWASH', label: 'ส่งซักซ้ำ (Re-wash)', color: '#2563eb' },
        { value: 'SET_STATUS_DAMAGED', label: 'แจ้งชำรุดทันที (Damaged)', color: '#d97706' },
        { value: 'SET_STATUS_VIP', label: 'ผ้า VIP (Priority)', color: '#9333ea' },
        { value: 'SET_MODE_WASH', label: 'เปลี่ยนโหมด: ส่งซัก (Dispatch)', color: '#059669' },
        { value: 'SET_MODE_CHECK', label: 'เปลี่ยนโหมด: ตรวจเช็ค (Check)', color: '#4b5563' },
    ];

    // ✅ โหลดข้อมูลทุกๆ 5 วินาที (Auto Refresh Status)
    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(fetchReaders, 5000); // Poll status every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchInitialData = async () => {
        try {
            // ถ้ามี API Ward ก็ดึงตรงนี้
            // const wardRes = await axios.get(`${BASE_URL}/Ward`);
            // setWards(wardRes.data);
            
            fetchReaders();
            fetchSpecialTags();
        } catch (err) { console.error("Error fetching initial data", err); }
    };

    const fetchReaders = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/Reader`);
            setReaders(res.data);
        } catch (err) { console.error("Load Readers Failed", err); }
    };

    const fetchSpecialTags = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/SpecialTag`);
            setSpecialTags(res.data);
        } catch (err) { console.error("Load SpecialTags Failed", err); }
    };

    // --- Handlers: Reader (Add & Edit) ---
    const handleSaveReader = async () => {
        if (!readerForm.name || !readerForm.location) {
            return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อ (Reader1, 2...) และสถานที่ติดตั้ง', 'warning');
        }

        const payload = {
            readerName: readerForm.name,
            ipAddress: readerForm.ip || 'รอการเชื่อมต่อ...',
            location: readerForm.location,
            readerFunction: readerForm.func,
            isActive: true,
            currentMode: 'Normal'
        };

        try {
            if (isEditingReader && editingReaderId) {
                // ถ้า API รองรับ PUT /Reader/{id}
                await axios.put(`${BASE_URL}/Reader/${editingReaderId}`, { ...payload, readerId: editingReaderId });
                Swal.fire('แก้ไขสำเร็จ', 'อัปเดตข้อมูลอุปกรณ์แล้ว', 'success');
            } else {
                await axios.post(`${BASE_URL}/Reader`, payload);
                Swal.fire('บันทึกสำเร็จ', 'เพิ่มอุปกรณ์เรียบร้อย', 'success');
            }

            setReaderForm({ name: '', ip: '', location: '', func: 'CHECK' });
            setIsEditingReader(false);
            setEditingReaderId(null);
            fetchReaders();

        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'ทำรายการไม่สำเร็จ', 'error');
        }
    };

    const handleEditClick = (r: Reader) => {
        setReaderForm({
            name: r.readerName,
            ip: r.ipAddress === '-' ? '' : r.ipAddress,
            location: typeof r.location === 'string' ? r.location : (r.location?.wardName || ''),
            func: r.readerFunction || 'CHECK'
        });
        setIsEditingReader(true);
        setEditingReaderId(r.readerId);
        // เลื่อนหน้าจอขึ้นไปที่ฟอร์ม
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setReaderForm({ name: '', ip: '', location: '', func: 'CHECK' });
        setIsEditingReader(false);
        setEditingReaderId(null);
    };

    const handleDeleteReader = (id: number) => {
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ต้องการลบอุปกรณ์นี้ออกจากระบบใช่หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบข้อมูล'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${BASE_URL}/Reader/${id}`);
                    Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                    fetchReaders();
                } catch (err: any) {
                    Swal.fire('ลบไม่สำเร็จ', err.response?.data?.message || 'Error', 'error');
                }
            }
        });
    };

    // --- Remote Config Handler ---
    const handleConfigReader = (r: Reader) => {
        Swal.fire({
            title: `ตั้งค่าอุปกรณ์: ${r.readerName}`,
            html: `
                <div style="text-align:left; margin-bottom: 10px;">
                    <label>คำสั่ง (Command):</label>
                    <select id="swal-cmd" class="swal2-input" style="margin-top:5px;">
                        <option value="CHECK_STATUS">เช็คสถานะ (Ping)</option>
                        <option value="REBOOT">รีสตาร์ทเครื่อง (Reboot)</option>
                        <option value="SHUTDOWN" style="color:red; font-weight:bold;">⛔ สั่งปิดเครื่อง (Shutdown)</option>
                    </select>
                </div>
                <div style="text-align:left;">
                    <label>ค่าเพิ่มเติม (Optional):</label>
                    <input id="swal-val" class="swal2-input" placeholder="-" style="margin-top:5px;">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'ส่งคำสั่ง (Send)',
            confirmButtonColor: '#7c3aed',
            preConfirm: () => {
                const cmd = (document.getElementById('swal-cmd') as HTMLSelectElement).value;
                const val = (document.getElementById('swal-val') as HTMLInputElement).value;
                return { cmd, val };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.post(`${BASE_URL}/Reader/Config`, {
                        readerId: r.readerName,
                        command: result.value?.cmd,
                        value: result.value?.val
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'ส่งคำสั่งเรียบร้อย',
                        text: `ส่ง ${result.value?.cmd} ไปยัง ${r.readerName} แล้ว`,
                        timer: 2000
                    });
                    
                    if (result.value?.cmd === 'SHUTDOWN') {
                        setTimeout(fetchReaders, 1000); 
                    }

                } catch (err) {
                    Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับ Server ได้', 'error');
                }
            }
        });
    };

    // --- Handlers: Special Tag ---
    const handleAddTag = async () => {
        if (!tagForm.rfid || !tagForm.action) {
            return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาสแกน RFID และเลือกคำสั่ง', 'warning');
        }
        try {
            await axios.post(`${BASE_URL}/SpecialTag`, {
                rfidCode: tagForm.rfid,
                actionType: tagForm.action,
                description: tagForm.desc
            });
            Swal.fire({ icon: 'success', title: 'บันทึก Special Tag แล้ว', timer: 1500, showConfirmButton: false });
            setTagForm({ rfid: '', action: '', desc: '' });
            setTimeout(() => rfidInputRef.current?.focus(), 100);
            fetchSpecialTags();
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
        }
    };

    const handleDeleteTag = (id: number) => {
        Swal.fire({
            title: 'ลบ Special Tag?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${BASE_URL}/SpecialTag/${id}`);
                    fetchSpecialTags();
                    Swal.fire('ลบแล้ว', '', 'success');
                } catch (err) { Swal.fire('Error', 'ลบไม่สำเร็จ', 'error'); }
            }
        });
    };

    const getLocationName = (r: Reader) => {
        if (typeof r.location === 'string') return r.location; 
        if (r.location?.wardName) return r.location.wardName;
        // หากมี wards state
        // const ward = wards.find(w => w.wardId === r.locationId);
        // return ward ? ward.wardName : '-';
        return '-';
    };

    return (
        <Box sx={{ pb: 5 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f7fa', color: '#006064' }}>
                    <SettingsRemote fontSize="large" />
                </Paper>
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                        ตั้งค่าการเชื่อมต่อ (Connect & Config)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        จัดการเครื่องอ่าน RFID (Readers) และกำหนดป้ายคำสั่งพิเศษ (Special Tags)
                    </Typography>
                </Box>
            </Box>

            {/* Tabs */}
            <Card sx={{ mb: 4 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, v) => setTabValue(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}
                >
                    <Tab label="1. จัดการอุปกรณ์ (READERS)" icon={<Router />} iconPosition="start" sx={{ fontWeight: 'bold', minHeight: 60 }} />
                    <Tab label="2. SPECIAL TAGS (ป้ายคำสั่ง)" icon={<AutoFixHigh />} iconPosition="start" sx={{ fontWeight: 'bold', minHeight: 60 }} />
                </Tabs>

                {/* --- Tab 1: Readers --- */}
                <Box role="tabpanel" hidden={tabValue !== 0}>
                    {tabValue === 0 && (
                        <CardContent sx={{ p: 3 }}>
                            {/* Form เพิ่ม/แก้ไข Reader */}
                            <Grid container spacing={3} alignItems="center" sx={{ mb: 4, p: 3, bgcolor: isEditingReader ? '#fff7ed' : '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Grid size={{ xs: 12 }} display="flex" alignItems="center" gap={1}>
                                    {isEditingReader ? <Edit color="warning" /> : <AddCircle color="primary" />}
                                    <Typography variant="subtitle2" fontWeight="bold" color={isEditingReader ? 'warning.main' : 'primary.main'}>
                                        {isEditingReader ? 'แก้ไขข้อมูลอุปกรณ์ (Edit Reader)' : 'เพิ่มเครื่องอ่านใหม่ (Add Reader)'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth label="ชื่อจุดติดตั้ง (Reader Name)" placeholder="ex: Reader1 (ต้องตรงกับ Code ESP32)"
                                        value={readerForm.name} onChange={e => setReaderForm({ ...readerForm, name: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Place fontSize="small" /></InputAdornment> }}
                                        disabled={isEditingReader} // ห้ามแก้ชื่อตอน Edit เดี๋ยว Server งง
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth label="จุดติดตั้ง (Location)" placeholder="เช่น หน้าห้องซัก, คลังผ้า"
                                        value={readerForm.location} onChange={e => setReaderForm({ ...readerForm, location: e.target.value })}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Router fontSize="small" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                     <FormControl fullWidth>
                                        <InputLabel>หน้าที่ (Function)</InputLabel>
                                        <Select
                                            value={readerForm.func}
                                            label="หน้าที่ (Function)"
                                            onChange={(e) => setReaderForm({ ...readerForm, func: e.target.value })}
                                        >
                                            <MenuItem value="CHECK">จุดตรวจเช็ค (Check)</MenuItem>
                                            <MenuItem value="WASH">ส่งซัก (Wash)</MenuItem>
                                            <MenuItem value="RECEIVE">รับผ้า (Restock)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    {isEditingReader && (
                                        <Button variant="outlined" color="inherit" onClick={handleCancelEdit}>ยกเลิก</Button>
                                    )}
                                    <Button
                                        variant="contained"
                                        color={isEditingReader ? "warning" : "primary"}
                                        startIcon={isEditingReader ? <Update /> : <Save />}
                                        onClick={handleSaveReader}
                                        sx={{ minWidth: 150 }}
                                    >
                                        {isEditingReader ? 'บันทึกแก้ไข' : 'บันทึกอุปกรณ์'}
                                    </Button>
                                </Grid>
                            </Grid>

                            {/* ตาราง Readers */}
                            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Reader Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Function</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {readers.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: '#9ca3af' }}>ไม่พบข้อมูล Reader</TableCell></TableRow>
                                        ) : readers.map((r) => (
                                            <TableRow key={r.readerId} hover selected={editingReaderId === r.readerId}>
                                                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{r.readerName}</TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>
                                                    {r.ipAddress && r.ipAddress !== '-' ? (
                                                        <Chip label={r.ipAddress} size="small" variant="outlined" />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>{getLocationName(r)}</TableCell>
                                                <TableCell><Chip label={r.readerFunction || 'CHECK'} size="small" color="info" /></TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={r.status || (r.isActive ? 'Online' : 'Offline')}
                                                        size="small"
                                                        color={r.status === 'Online' || r.isActive ? 'success' : 'default'}
                                                        variant="filled"
                                                        sx={{ fontWeight: 'bold', minWidth: 80 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="ตั้งค่า (Config)">
                                                            <IconButton size="small" onClick={() => handleConfigReader(r)} sx={{ color: '#7c3aed', bgcolor: '#f3e8ff' }}>
                                                                <SettingsInputComponent fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="แก้ไข">
                                                            <IconButton size="small" color="primary" onClick={() => handleEditClick(r)} sx={{ bgcolor: '#eff6ff' }}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="ลบ">
                                                            <IconButton size="small" color="error" onClick={() => handleDeleteReader(r.readerId)} sx={{ bgcolor: '#fef2f2' }}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    )}
                </Box>

                {/* --- Tab 2: Special Tags --- */}
                <Box role="tabpanel" hidden={tabValue !== 1}>
                    {tabValue === 1 && (
                        <CardContent sx={{ p: 3 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <strong>Special Tags คืออะไร?</strong> คือป้าย RFID พิเศษที่ใช้เป็น "คำสั่ง" เมื่อสแกนร่วมกับผ้าปกติ <br />
                                เช่น: สแกนป้าย <em>"เปลี่ยนโหมด: ส่งซัก"</em> &rarr; เครื่องอ่านจะเปลี่ยนโหมดเป็น Washing ทันที
                            </Alert>

                            <Grid container spacing={3} alignItems="center" sx={{ mb: 4, p: 3, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
                                <Grid size={{ xs: 12 }}><Typography variant="subtitle2" fontWeight="bold" color="#c2410c">ลงทะเบียนป้ายคำสั่ง (Register Command Tag)</Typography></Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        inputRef={rfidInputRef}
                                        fullWidth label="สแกน RFID Tag ที่นี่..." placeholder="Focus here & Scan"
                                        value={tagForm.rfid} onChange={e => setTagForm({ ...tagForm, rfid: e.target.value })}
                                        autoFocus
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Tag fontSize="small" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>เลือกคำสั่ง (Action)</InputLabel>
                                        <Select
                                            value={tagForm.action}
                                            label="เลือกคำสั่ง (Action)"
                                            onChange={e => setTagForm({ ...tagForm, action: e.target.value })}
                                        >
                                            {actionOptions.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    <Box component="span" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: opt.color, mr: 2, display: 'inline-block' }} />
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth label="รายละเอียด (เช่น ป้ายติดรถเข็น 1)"
                                        value={tagForm.desc} onChange={e => setTagForm({ ...tagForm, desc: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="contained" color="warning" startIcon={<AddCircle />} onClick={handleAddTag} sx={{ px: 4 }}>บันทึก Special Tag</Button>
                                </Grid>
                            </Grid>

                            <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: '#fff7ed' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>คำสั่ง (Action)</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>รายละเอียด</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {specialTags.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#9ca3af' }}>ยังไม่มี Special Tag</TableCell></TableRow>
                                        ) : specialTags.map((t) => {
                                            const opt = actionOptions.find(o => o.value === t.actionType);
                                            return (
                                                <TableRow key={t.tagId}>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ea580c' }}>{t.rfidCode}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={opt?.label || t.actionType}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                color: opt?.color || 'grey',
                                                                borderColor: opt?.color || 'grey',
                                                                fontWeight: 'bold',
                                                                bgcolor: 'transparent'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{t.description}</TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteTag(t.tagId)}><Delete fontSize="small" /></IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    )}
                </Box>
            </Card>
        </Box>
    );
};

export default RfidConnect;