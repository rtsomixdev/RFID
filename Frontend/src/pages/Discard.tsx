import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, FormControl, Select, MenuItem,
    Stack, Tooltip, Collapse, useTheme, alpha,
    Alert, CircularProgress, Chip
} from '@mui/material';
import {
    LinkOff, Delete, Search, Build, BugReport, DeleteForever,
    PlaylistRemove, History, RestartAlt, Refresh, QrCodeScanner
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// --- Interfaces ---
interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

interface DiscardMonitorItem {
    rfid: string;
    productName: string;
    location: string;
    status: string;
    updatedAt: string;
}

const Discard: React.FC = () => {
    const theme = useTheme();
    const [reasons, setReasons] = useState<any[]>([]);
    
    // Form & Input States
    const [rfidInput, setRfidInput] = useState('');
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [note, setNote] = useState('');
    const [scannedItems, setScannedItems] = useState<CandidateItem[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // 🔥 State สำหรับตาราง Monitor ด้านล่าง
    const [discardedList, setDiscardedList] = useState<DiscardMonitorItem[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);

    // State สำหรับ Manual Troubleshoot Mode
    const [manualRfid, setManualRfid] = useState('');
    const [showTroubleshoot, setShowTroubleshoot] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        fetchReasons();
        fetchDiscardedList(); // โหลดตารางล่างตอนเริ่ม

        // Auto Refresh ตารางล่างทุก 5 วินาที
        const interval = setInterval(() => {
            fetchDiscardedList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // 🔥🔥🔥 ดักฟังค่าจาก MQTT / Scanner (Hardware Auto Scan) 🔥🔥🔥
    useEffect(() => {
        const handleAutoScan = async (e: any) => {
            const incomingData = e.detail;
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;

            if (rfid) {
                setScannedItems(prev => {
                    if (prev.find(item => item.rfidCode === rfid)) {
                        return prev;
                    }
                    findAndAddLinen(rfid);
                    return prev;
                });
            }
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => {
            window.removeEventListener("RFID_SCANNED", handleAutoScan);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ฟังก์ชันค้นหาและเพิ่มผ้าเข้าตาราง (เรียกใช้เมื่อสแกนเจอ)
    const findAndAddLinen = async (rfid: string) => {
        try {
            const res = await axiosClient.get(`/Linen/Search?rfid=${rfid}`);
            if (res.data && res.data.length > 0) {
                const foundItem = res.data[0];
                const newItem: CandidateItem = {
                    rfidCode: foundItem.rfidCode,
                    productName: foundItem.product?.productName || "Unknown Item",
                    status: foundItem.status || "Unknown"
                };

                setScannedItems(prev => {
                    if (prev.find(s => s.rfidCode === newItem.rfidCode)) return prev;
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                    Toast.fire({ icon: 'success', title: `รับค่า: ${newItem.productName}` });
                    return [newItem, ...prev];
                });
            } else {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                Toast.fire({ icon: 'warning', title: `ไม่พบข้อมูล: ${rfid}` });
            }
        } catch (err) {
            console.error("Scan Error:", err);
        }
    };

    const fetchReasons = async () => {
        try {
            const res = await axiosClient.get('/DamageReason');
            setReasons(res.data || []);
        } catch (err) { console.error(err); }
    };

    // ✅ ฟังก์ชันดึงข้อมูลตารางที่ถูก "ตัดจำหน่าย" (Monitor)
    const fetchDiscardedList = async () => {
        try {
            const res = await axiosClient.get('/Linen/Monitor/Latest');
            const data = res.data || [];

            // กรองเอาเฉพาะสถานะ 'จำหน่ายออก' หรือสถานที่ 'จุดจำหน่าย'
            const filtered = data.filter((item: any) => 
                item.status === 'จำหน่ายออก' || 
                item.status === 'Disposed' ||
                item.location === 'จุดจำหน่าย' ||
                item.location === 'จุดจำหน่าย (Disposal)'
            );

            const mappedData: DiscardMonitorItem[] = filtered.map((item: any) => ({
                rfid: item.RfidCode || item.rfidCode || item.rfid || '-',
                productName: item.ItemName || item.productName || item.product_name || '-',
                location: item.CurrentLocation || item.currentLocation || item.location || '-',
                status: item.Status || item.status || '-',
                updatedAt: item.UpdatedAt || item.updatedAt || item.registeredAt
            }));

            setDiscardedList(mappedData);
            setLoadingTable(false);
        } catch (err) { 
            console.error("Fetch Discarded Error: ", err); 
            setLoadingTable(false);
        }
    };

    // ✅ ฟังก์ชันรับค่าจากการยิงปืนสแกนเนอร์ (Keyboard Wedge)
    const handleManualScanInput = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanRfid = rfidInput.trim();
        if (!cleanRfid) return;
        
        await findAndAddLinen(cleanRfid);
        setRfidInput(''); // ล้างช่องรอสแกนชิ้นต่อไป
    };

    const handleRemoveItem = (rfid: string) => {
        setScannedItems(prev => prev.filter(item => item.rfidCode !== rfid));
    };

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
                    fetchDiscardedList(); // รีเฟรชตารางล่างทันที
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

            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* ✅ 1. Scan Input (ตัด Dropdown ออก เปลี่ยนเป็นช่องรับสแกนอย่างเดียว) */}
                        <Grid item xs={12}>
                            <form onSubmit={handleManualScanInput}>
                                <FormLabel label="1. สแกน RFID / ยิงบาร์โค้ด (Scan Item)">
                                    <TextField
                                        fullWidth
                                        size="medium"
                                        placeholder="พร้อมรับค่าสแกน RFID..."
                                        value={rfidInput}
                                        onChange={(e) => setRfidInput(e.target.value)}
                                        InputProps={{ startAdornment: <QrCodeScanner color="action" sx={{ mr: 1 }} /> }}
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </FormLabel>
                            </form>
                        </Grid>

                        {/* 2. จัดระเบียบ Action Grid สีเหลือง */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>
                                2. ระบุสาเหตุการตัดจำหน่ายและยืนยัน
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), borderColor: alpha(theme.palette.warning.main, 0.3), borderRadius: 2 }}>
                                <Grid container spacing={2} alignItems="flex-end">
                                    <Grid item xs={12} md={4}>
                                        <FormLabel label="สาเหตุ (Reason)" required>
                                            <Select size="small" fullWidth value={selectedReason} displayEmpty onChange={(e) => setSelectedReason(e.target.value)} sx={{ bgcolor: 'white' }}>
                                                <MenuItem value="" disabled>เลือกสาเหตุ</MenuItem>
                                                {reasons.map((r: any) => (
                                                    <MenuItem key={r.reasonId || r.id} value={String(r.reasonId || r.id)}>{r.reasonName}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormLabel>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <FormLabel label="หมายเหตุ (Note)">
                                            <TextField size="small" fullWidth placeholder="ระบุรายละเอียดเพิ่มเติม..." value={note} onChange={e => setNote(e.target.value)} sx={{ bgcolor: 'white' }} />
                                        </FormLabel>
                                    </Grid>
                                    <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            variant="outlined" color="inherit" onClick={clearForm}
                                            disabled={scannedItems.length === 0}
                                            sx={{ minWidth: 100, height: 40 }}
                                        >
                                            ล้างค่า
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="warning"
                                            startIcon={<LinkOff />}
                                            onClick={handleDiscardAndUnbind}
                                            disabled={scannedItems.length === 0}
                                            fullWidth
                                            sx={{ fontWeight: 'bold', height: 40, boxShadow: theme.shadows[2] }}
                                        >
                                            ยืนยันตัดจำหน่าย
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* List Table (รายการที่สแกนเข้ามาเตรียมตัดจำหน่าย) */}
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

            {/* ✅ ตาราง Monitor รายการที่จำหน่ายออกแล้ว */}
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.error.light}` }}>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                        <History color="error" />
                        <Typography variant="h6" fontWeight="bold" color="error.main">ประวัติผ้าที่ถูกตัดจำหน่ายล่าสุด</Typography>
                        <Chip label={`${discardedList.length} รายการ`} size="small" color="error" sx={{ fontWeight: 'bold', ml: 1 }} />
                    </Stack>
                    <Button startIcon={<Refresh />} size="small" variant="outlined" color="error" onClick={() => { setLoadingTable(true); fetchDiscardedList(); }}>
                        อัปเดตข้อมูล
                    </Button>
                </Box>

                <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>RFID Code</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '35%' }}>ชื่อสินค้า</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>สถานที่ล่าสุด</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '15%' }}>เวลาทำรายการ</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '10%' }} align="center">สถานะ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingTable ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                            ) : discardedList.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>ไม่พบรายการผ้าที่ถูกตัดจำหน่าย</TableCell></TableRow>
                            ) : (
                                discardedList.map((item, index) => (
                                    <TableRow key={`${item.rfid}-${index}`} hover sx={{ '& td': { py: 1.5 } }}>
                                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'error.main' }}>
                                            {item.rfid}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>
                                            {item.productName}
                                        </TableCell>
                                        <TableCell sx={{ color: 'text.secondary' }}>
                                            {item.location !== '-' ? (
                                                <Typography variant="body2">{item.location}</Typography>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.9rem' }}>
                                            {item.updatedAt ? new Date(item.updatedAt).toLocaleString('th-TH') : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={item.status} color="error" size="small" variant="filled" sx={{ fontWeight: 600, minWidth: 90 }} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

        </Box>
    );
};

export default Discard;