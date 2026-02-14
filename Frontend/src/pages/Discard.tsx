import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, FormControl, Select, MenuItem,
    Stack, Autocomplete, Tooltip, Collapse, useTheme, alpha,
    Alert
} from '@mui/material';
import {
    LinkOff, Delete, Search, Build, BugReport, DeleteForever,
    PlaylistRemove, History, RestartAlt
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Discard: React.FC = () => {
    const theme = useTheme();
    const [reasons, setReasons] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [searchSelection, setSearchSelection] = useState<CandidateItem | null>(null);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [note, setNote] = useState('');
    const [scannedItems, setScannedItems] = useState<CandidateItem[]>([]);
    const [deleteHistory, setDeleteHistory] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // State สำหรับ Manual Troubleshoot Mode
    const [manualRfid, setManualRfid] = useState('');
    const [showTroubleshoot, setShowTroubleshoot] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        fetchReasons();
        fetchHistory();
        fetchCandidates();
    }, []);

    // 🔥🔥🔥 เพิ่มส่วนนี้: ดักฟังค่าจาก MQTT / Scanner 🔥🔥🔥
    useEffect(() => {
        const handleAutoScan = async (e: any) => {
            const incomingData = e.detail;
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;

            if (rfid) {
                // เช็คก่อนว่ามีในรายการที่เลือกหรือยัง
                setScannedItems(prev => {
                    if (prev.find(item => item.rfidCode === rfid)) {
                        return prev; // ถ้ามีแล้วไม่ต้องทำอะไร
                    }
                    // ถ้ายังไม่มี ให้ไปค้นหาข้อมูลแล้วเพิ่มเข้าตาราง
                    findAndAddLinen(rfid);
                    return prev;
                });
            }
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => {
            window.removeEventListener("RFID_SCANNED", handleAutoScan);
        };
    }, []);

    // ฟังก์ชันช่วยค้นหาและเพิ่มผ้าเข้าตาราง (ใช้ทั้งตอนสแกน และตอนค้นหาเอง)
    const findAndAddLinen = async (rfid: string) => {
        try {
            // ใช้ API Search เพื่อหาข้อมูล (แม้ Active=false)
            const res = await axiosClient.get(`/Linen/Search?rfid=${rfid}`);

            if (res.data && res.data.length > 0) {
                const foundItem = res.data[0];
                const newItem: CandidateItem = {
                    rfidCode: foundItem.rfidCode,
                    productName: foundItem.product?.productName || "Unknown Item",
                    status: foundItem.status || "Unknown"
                };

                setScannedItems(prev => {
                    // เช็คซ้ำอีกรอบกันพลาด
                    if (prev.find(s => s.rfidCode === newItem.rfidCode)) return prev;

                    // แจ้งเตือนเล็กๆ
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                    Toast.fire({ icon: 'success', title: `รับค่า: ${newItem.productName}` });

                    return [newItem, ...prev];
                });
            } else {
                // ถ้าสแกนแล้วไม่เจอในระบบ (อาจจะเป็น Tag เปล่า)
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                Toast.fire({ icon: 'warning', title: `ไม่พบข้อมูล: ${rfid}` });
            }
        } catch (err) {
            console.error("Scan Error:", err);
        }
    };

    const fetchCandidates = async () => {
        try {
            const res = await axiosClient.get('/Linen/Candidates/Discard');
            setCandidates(res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchReasons = async () => {
        try {
            const res = await axiosClient.get('/DamageReason');
            setReasons(res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchHistory = async () => {
        try {
            const res = await axiosClient.get('/Linen/DeleteHistory');
            setDeleteHistory(res.data || []);
        } catch (err) { console.error(err); }
    };

    const handleSelectItem = (item: CandidateItem | null) => {
        if (!item) return;
        if (scannedItems.find(s => s.rfidCode === item.rfidCode)) {
            Swal.fire({ icon: 'warning', title: 'รายการนี้เลือกไปแล้ว', timer: 1000, showConfirmButton: false });
            setSearchSelection(null);
            return;
        }
        setScannedItems(prev => [item, ...prev]);
        setTimeout(() => setSearchSelection(null), 100);
    };

    const handleRemoveItem = (rfid: string) => {
        setScannedItems(prev => prev.filter(item => item.rfidCode !== rfid));
    };

    // ✅ ฟังก์ชันเช็ค RFID โดยตรง (โหมดแก้ปัญหา)
    const handleManualCheck = async () => {
        if (!manualRfid) return;
        await findAndAddLinen(manualRfid.trim());
        setManualRfid('');
    };

    // 1. Logic หลัก: Discard & Unbind
    const handleDiscardAndUnbind = async () => {
        if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');
        if (!selectedReason) return Swal.fire('เตือน', 'กรุณาระบุสาเหตุ', 'warning');

        Swal.fire({
            title: 'ยืนยันการตัดจำหน่าย?',
            html: `
            <div style="text-align: left;">
                <p>กำลังดำเนินการกับ <strong>${scannedItems.length}</strong> รายการ</p>
                <div style="background-color: #fff7ed; padding: 10px; border-radius: 6px; border: 1px solid #ffedd5; color: #9a3412;">
                    <strong>ผลลัพธ์:</strong> <br/>
                    1. เปลี่ยนสถานะเป็น <b>${reasons.find(r => String(r.reasonId || r.id) === selectedReason)?.reasonName || 'Damaged'}</b><br/>
                    2. <b>Reset Tag</b> (ปลดล็อคข้อมูลออกจาก RFID เพื่อรอใช้ใหม่)
                </div>
            </div>
        `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: theme.palette.warning.main,
            confirmButtonText: 'ยืนยัน (Reset Tag)'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        rfidCodes: scannedItems.map(i => i.rfidCode),
                        damageReasonId: parseInt(selectedReason),
                        note: note || "",
                        reportedByUserId: currentUser?.userId || 1
                    };

                    await axiosClient.post('/Linen/DiscardBatch', payload);

                    Swal.fire('สำเร็จ', 'ตัดจำหน่ายและคืนค่าแท็กเรียบร้อย (Reset Tag)', 'success');

                    const reasonName = reasons.find(r => String(r.reasonId || r.id) === selectedReason)?.reasonName || 'ไม่ระบุ';
                    await sendNotification(
                        "ตัดจำหน่ายผ้า",
                        `ตัดจำหน่าย ${scannedItems.length} รายการ (สาเหตุ: ${reasonName})`,
                        "WARNING", "/discard", undefined, 1
                    );

                    clearForm();
                } catch (err: any) {
                    Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    };

    // 2. Logic สำรอง: Force Delete
    const handleForceDelete = async () => {
        if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');

        Swal.fire({
            title: 'ลบถาวร (Force Delete)',
            html: `<span style="color:red">คำเตือน: ข้อมูลจะหายไปจาก Database ทันที!</span><br/>(ใช้เฉพาะกรณีกู้คืนไม่ได้แล้ว)`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'ลบทิ้งทันที',
            confirmButtonColor: theme.palette.error.main
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axiosClient.post('/Linen/DeleteBatch', scannedItems.map(i => i.rfidCode));
                    Swal.fire('ลบสำเร็จ', 'ลบข้อมูลออกจากระบบถาวรแล้ว', 'success');
                    clearForm();
                } catch (err: any) {
                    Swal.fire('Error', err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
                }
            }
        });
    };

    const clearForm = () => {
        setScannedItems([]);
        setNote('');
        setSelectedReason('');
        fetchHistory();
        fetchCandidates();
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="แจ้งตัดจำหน่าย & คืนค่าแท็ก (Discard & Reset Tag)"
                subtitle="จัดการผ้าชำรุด/สูญหาย และรีเซ็ตสถานะ Tag ให้ว่างเพื่อนำกลับมาใช้ใหม่"
                icon={<PlaylistRemove fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ตัดจำหน่าย' }
                ]}
            />

            {/* Main Card */}
            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* 1. Search (Full Width) */}
                        <Grid item xs={12}>
                            <FormLabel label="1. ค้นหา / สแกน (จากรายชื่อ)">
                                <Autocomplete
                                    value={searchSelection}
                                    onChange={(event, newValue) => handleSelectItem(newValue)}
                                    options={candidates.filter(c => !scannedItems.find(s => s.rfidCode === c.rfidCode))}
                                    getOptionLabel={(option) => `${option.productName} (${option.rfidCode})`}
                                    autoHighlight autoSelect blurOnSelect
                                    size="medium"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder="พิมพ์ชื่อ หรือสแกน RFID..."
                                            InputProps={{ ...params.InputProps, startAdornment: <Search color="action" sx={{ mr: 1 }} /> }}
                                        />
                                    )}
                                    noOptionsText="ไม่พบข้อมูล (ลองใช้โหมดแก้ปัญหาด้านล่าง)"
                                    fullWidth
                                />
                            </FormLabel>
                        </Grid>

                        {/* 2. Action (Full Width) */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>2. ระบุสาเหตุการตัดจำหน่าย</Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderColor: alpha(theme.palette.warning.main, 0.3) }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <FormLabel label="สาเหตุ (Reason)" required>
                                            <Select value={selectedReason} displayEmpty onChange={(e) => setSelectedReason(e.target.value)}>
                                                <MenuItem value="" disabled>เลือกสาเหตุ</MenuItem>
                                                {reasons.map((r: any) => (
                                                    <MenuItem key={r.reasonId || r.id} value={String(r.reasonId || r.id)}>{r.reasonName}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormLabel>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormLabel label="หมายเหตุ (Note)">
                                            <TextField fullWidth placeholder="ระบุรายละเอียดเพิ่มเติม..." value={note} onChange={e => setNote(e.target.value)} />
                                        </FormLabel>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                    <Button
                                        variant="outlined" color="inherit" onClick={clearForm} startIcon={<RestartAlt />}
                                        disabled={scannedItems.length === 0}
                                    >
                                        ล้างค่า
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        startIcon={<LinkOff />}
                                        onClick={handleDiscardAndUnbind}
                                        disabled={scannedItems.length === 0}
                                        sx={{ fontWeight: 'bold', px: 4, boxShadow: theme.shadows[4] }}
                                    >
                                        ยืนยันตัดจำหน่าย (Reset Tag)
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* List Table */}
                    {scannedItems.length > 0 && (
                        <TableContainer sx={{ mt: 3, maxHeight: 300, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>สินค้า</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>ลบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scannedItems.map((item, idx) => (
                                        <TableRow key={idx} hover>
                                            <TableCell sx={{ fontWeight: 'bold', maxWidth: 200 }}>
                                                <Tooltip title={item.productName}>
                                                    <Typography variant="body2" fontWeight="bold" noWrap>
                                                        {item.productName}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 150 }}>
                                                <Tooltip title={item.rfidCode}>
                                                    <Typography variant="body2" fontFamily="monospace" color="primary.main" noWrap>
                                                        {item.rfidCode}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>{item.status}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.rfidCode)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* 🔥 Troubleshoot Zone */}
            <Box sx={{ mb: 3 }}>
                <Button
                    onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                    startIcon={<Build />}
                    color="error" sx={{ textTransform: 'none' }}
                >
                    {showTroubleshoot ? 'ซ่อนเครื่องมือแก้ปัญหา' : 'เครื่องมือแก้ปัญหา Tag ค้าง (Troubleshoot)'}
                </Button>
                <Collapse in={showTroubleshoot}>
                    <Card sx={{ mt: 1, border: `1px dashed ${theme.palette.error.main}`, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <BugReport color="error" />
                                <Typography variant="subtitle1" fontWeight="bold" color="error">แก้ปัญหา Tag ค้าง / ลบไม่ออก</Typography>
                            </Stack>
                            <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} md={8}>
                                    <FormLabel label="ระบุ RFID Tag ที่มีปัญหา">
                                        <TextField fullWidth size="small" placeholder="เช่น E200..." value={manualRfid} onChange={e => setManualRfid(e.target.value)} sx={{ bgcolor: 'white' }} />
                                    </FormLabel>
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', pb: '2px' }}>
                                    <Button variant="contained" onClick={handleManualCheck} disabled={!manualRfid} sx={{ height: 40 }}>ตรวจสอบ</Button>
                                    <Button variant="contained" color="error" onClick={handleForceDelete} disabled={scannedItems.length === 0} startIcon={<DeleteForever />} sx={{ height: 40 }}>ลบถาวร</Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Collapse>
            </Box>

            {/* History */}
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">ประวัติการดำเนินการล่าสุด</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small">
                        <TableBody>
                            {deleteHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={2} align="center" sx={{ color: 'text.secondary', py: 2 }}>ไม่มีประวัติล่าสุด</TableCell></TableRow>
                            ) : deleteHistory.map((log: any) => (
                                <TableRow key={log.id}>
                                    <TableCell sx={{ color: 'text.primary', maxWidth: 250 }}>
                                        <Tooltip title={log.item}>
                                            <Typography variant="body2" noWrap>
                                                {log.item}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{log.time}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default Discard;