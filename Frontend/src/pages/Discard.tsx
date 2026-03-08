import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, FormControl, Select, MenuItem,
    Stack, Tooltip, Collapse, useTheme, alpha,
    Alert, CircularProgress, Chip, TablePagination
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

/**
 * โครงสร้างข้อมูลรายการที่สแกน
 * @interface CandidateItem
 */
interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

/**
 * โครงสร้างข้อมูลประวัติการตัดจำหน่าย (เหมือนหน้า Report)
 * @interface DiscardMonitorItem
 */
interface DiscardMonitorItem {
    id: string | number;
    date: string;
    type: string;
    productName: string;
    flow: string;
    qty: number;
    user: string;
}

/**
 * หน้าจอการตัดจำหน่ายผ้า (Discard & Reset Tag)
 * 
 * @returns {JSX.Element} คอมโพเนนต์หน้าจอการตัดจำหน่าย
 */
const Discard: React.FC = () => {
    const theme = useTheme();

    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const permissions = currentUser?.permissions || currentUser?.Permissions || [];
    const roleId = currentUser?.roleId || currentUser?.RoleId || 0;

    const canManage = roleId === 1 || permissions.includes('MANAGE_DISCARD');

    const [reasons, setReasons] = useState<any[]>([]);

    const [rfidInput, setRfidInput] = useState('');
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [note, setNote] = useState('');
    const [scannedItems, setScannedItems] = useState<CandidateItem[]>([]);

    const [discardedList, setDiscardedList] = useState<DiscardMonitorItem[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);

    // เก็บประวัติการตัดจำหน่ายใน Session Storage ชั่วคราว เพื่อไม่ให้หายเมื่อรีเฟรชหน้าจอ
    const [sessionLogs, setSessionLogs] = useState<DiscardMonitorItem[]>(() => {
        const savedLogs = sessionStorage.getItem('discardSessionLogs');
        return savedLogs ? JSON.parse(savedLogs) : [];
    });

    const [manualRfid, setManualRfid] = useState('');
    const [showTroubleshoot, setShowTroubleshoot] = useState(false);

    const [page1, setPage1] = useState(0);
    const [rowsPerPage1, setRowsPerPage1] = useState(10);
    const handleChangePage1 = (event: unknown, newPage: number) => setPage1(newPage);
    const handleChangeRowsPerPage1 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage1(+event.target.value);
        setPage1(0);
    };

    const [page2, setPage2] = useState(0);
    const [rowsPerPage2, setRowsPerPage2] = useState(10);
    const handleChangePage2 = (event: unknown, newPage: number) => setPage2(newPage);
    const handleChangeRowsPerPage2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage2(+event.target.value);
        setPage2(0);
    };

    useEffect(() => {
        fetchReasons();
        fetchDiscardedList();

        const interval = setInterval(() => {
            fetchDiscardedList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleAutoScan = async (e: any) => {
            const incomingData = e.detail;
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;

            if (rfid) {
                if (!canManage) {
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                    Toast.fire({ icon: 'error', title: `คุณไม่มีสิทธิ์ตัดจำหน่ายผ้า` });
                    return;
                }
                setScannedItems(prev => {
                    if (prev.find(item => item.rfidCode === rfid)) return prev;
                    findAndAddLinen(rfid);
                    return prev;
                });
            }
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => window.removeEventListener("RFID_SCANNED", handleAutoScan);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManage]);

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

    // ดึงข้อมูลประวัติความเคลื่อนไหวจากระบบ
    const fetchDiscardedList = async () => {
        try {
            const res = await axiosClient.get('/Report/Movement');
            const data = res.data || [];

            // กรองเงื่อนไขนำเฉพาะข้อมูลประเภท "จำหน่ายออก"
            const filtered = data.filter((item: any) => {
                const t = (item.type || '').toUpperCase();
                return t === 'DISCARD' || t === 'LOST' || t === 'DAMAGED' || t === 'จำหน่ายออก';
            });

            // เรียงลำดับข้อมูลจากรายการล่าสุดไปเก่าสุด
            filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const mappedData: DiscardMonitorItem[] = filtered.map((item: any) => ({
                id: item.id || Math.random().toString(),
                date: item.date,
                type: 'จำหน่ายออก',
                productName: item.productName || 'ไม่ระบุสินค้า',
                flow: item.flow || '-',
                qty: item.qty || 0,
                user: item.user || 'Auto System'
            }));

            // แสดงผลเฉพาะ 30 รายการล่าสุด
            setDiscardedList(mappedData.slice(0, 30));
            setLoadingTable(false);
        } catch (err) {
            console.error("Fetch Discarded Error: ", err);
            setLoadingTable(false);
        }
    };

    const handleManualScanInput = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanRfid = rfidInput.trim();
        if (!cleanRfid) return;

        await findAndAddLinen(cleanRfid);
        setRfidInput('');
    };

    const handleRemoveItem = (rfid: string) => {
        setScannedItems(prev => prev.filter(item => item.rfidCode !== rfid));
    };

    const handleManualCheck = async () => {
        if (!manualRfid) return;
        await findAndAddLinen(manualRfid.trim());
        setManualRfid('');
    };

    const addSessionLogs = (newItems: DiscardMonitorItem[]) => {
        setSessionLogs(prev => {
            const updatedLogs = [...newItems, ...prev];
            sessionStorage.setItem('discardSessionLogs', JSON.stringify(updatedLogs.slice(0, 50)));
            return updatedLogs;
        });
    };

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

                    // บันทึกประวัติการส่งตัดจำหน่ายลง Session Storage ชั่วคราว
                    const newLogs: DiscardMonitorItem[] = scannedItems.map((i, index) => ({
                        id: `temp-${Date.now()}-${index}`,
                        date: new Date().toISOString(),
                        type: 'จำหน่ายออก',
                        productName: `${i.productName} (RFID: ${i.rfidCode})`,
                        flow: `คลังผ้า -> จำหน่ายออก (${reasonName})`,
                        qty: -1,
                        user: currentUser?.firstName || 'System'
                    }));
                    addSessionLogs(newLogs);

                    await sendNotification(
                        "ตัดจำหน่ายผ้า",
                        `ตัดจำหน่าย ${scannedItems.length} รายการ (สาเหตุ: ${reasonName})`,
                        "WARNING", "/discard", undefined, 1
                    );

                    clearForm();
                    // ร้องขอให้ตารางดึงข้อมูลล่าช้าเล็กน้อยเพื่อให้ฐานข้อมูลอัปเดต
                    setTimeout(() => fetchDiscardedList(), 1000);
                } catch (err: any) {
                    Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    };

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

                    // บันทึกประวัติการลบข้อมูลถาวร
                    const newLogs: DiscardMonitorItem[] = scannedItems.map((i, index) => ({
                        id: `del-${Date.now()}-${index}`,
                        date: new Date().toISOString(),
                        type: 'ลบถาวร',
                        productName: `${i.productName} (RFID: ${i.rfidCode})`,
                        flow: 'ลบออกจากระบบ Database',
                        qty: -1,
                        user: currentUser?.firstName || 'System'
                    }));
                    addSessionLogs(newLogs);

                    clearForm();
                    setTimeout(() => fetchDiscardedList(), 1000);
                } catch (err: any) {
                    Swal.fire('Error', err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
                }
            }
        });
    };

    const handleClearSessionLogs = () => {
        setSessionLogs([]);
        sessionStorage.removeItem('discardSessionLogs');
    };

    const clearForm = () => {
        setScannedItems([]);
        setNote('');
        setSelectedReason('');
    };

    // รวมประวัติจํานวนจำหน่ายในช่วง Session ปัจจุบันเข้ากับข้อมูลจากฐานข้อมูล
    const displayList = [...sessionLogs];
    discardedList.forEach(item => {
        // ป้องกันการแสดงผลซ้ำซ้อนซ้อนทับกันระหว่าง Session และ Database
        if (!displayList.find(log => log.productName.includes(item.productName) && log.date === item.date)) {
            displayList.push(item);
        }
    });

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

            {canManage && (
                <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={3}>
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
                                            <Button variant="outlined" color="inherit" onClick={clearForm} disabled={scannedItems.length === 0} sx={{ minWidth: 100, height: 40 }}>
                                                ล้างค่า
                                            </Button>
                                            <Button variant="contained" color="warning" startIcon={<LinkOff />} onClick={handleDiscardAndUnbind} disabled={scannedItems.length === 0} fullWidth sx={{ fontWeight: 'bold', height: 40, boxShadow: theme.shadows[2] }}>
                                                ยืนยันตัดจำหน่าย
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>
                        </Grid>

                        {scannedItems.length > 0 && (
                            <>
                                <TableContainer sx={{ mt: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>สินค้า</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ลบ</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {scannedItems.slice(page1 * rowsPerPage1, page1 * rowsPerPage1 + rowsPerPage1).map((item, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ fontWeight: 'bold', maxWidth: 200 }}>
                                                        <Tooltip title={item.productName}>
                                                            <Typography variant="body2" fontWeight="bold" noWrap>{item.productName}</Typography>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 150 }}>
                                                        <Tooltip title={item.rfidCode}>
                                                            <Typography variant="body2" fontFamily="monospace" color="primary.main" noWrap>{item.rfidCode}</Typography>
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
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={scannedItems.length}
                                    rowsPerPage={rowsPerPage1}
                                    page={page1}
                                    onPageChange={handleChangePage1}
                                    onRowsPerPageChange={handleChangeRowsPerPage1}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {canManage && (
                <Box sx={{ mb: 3 }}>
                    <Button onClick={() => setShowTroubleshoot(!showTroubleshoot)} startIcon={<Build />} color="error" sx={{ textTransform: 'none' }}>
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
            )}

            {/* ตารางแสดงประวัติความเคลื่อนไหวของการตัดจำหน่าย (ธีมสีแดง) */}
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.error.light}` }}>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                        <History color="error" />
                        <Typography variant="h6" fontWeight="bold" color="error.main">ประวัติการเคลื่อนไหวล่าสุด (Filtered: จำหน่ายออก)</Typography>
                        <Chip label={`${displayList.length} รายการ`} size="small" color="error" sx={{ fontWeight: 'bold', ml: 1 }} />
                    </Stack>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {sessionLogs.length > 0 && (
                            <Button size="small" variant="text" color="error" onClick={handleClearSessionLogs}>ล้างประวัติ (Local)</Button>
                        )}
                        <Button startIcon={<Refresh />} size="small" variant="outlined" color="error" onClick={() => { setLoadingTable(true); fetchDiscardedList(); }}>
                            อัปเดตข้อมูล
                        </Button>
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {/* คอลัมน์รูปแบบเดียวกับหน้าต่างรายงานความเคลื่อนไหว */}
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>วัน/เวลา</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>ประเภท</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>สินค้า (RFID)</TableCell>
                                <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>เส้นทาง (Flow)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>จำนวน</TableCell>
                                <TableCell align="center" sx={{ fontWeight: '700', bgcolor: '#f8fafc' }}>โดย</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingTable && displayList.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                            ) : displayList.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>ไม่พบประวัติการจำหน่ายออก</TableCell></TableRow>
                            ) : (
                                displayList.slice(page2 * rowsPerPage2, page2 * rowsPerPage2 + rowsPerPage2).map((item, index) => (
                                    <TableRow key={`${item.id}-${index}`} hover sx={{ '& td': { py: 1.5 }, bgcolor: item.type === 'ลบถาวร' ? alpha(theme.palette.error.main, 0.02) : 'inherit' }}>
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                            {new Date(item.date).toLocaleString('th-TH')}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.type}
                                                color="error"
                                                size="small"
                                                variant={item.type === 'ลบถาวร' ? 'outlined' : 'filled'}
                                                sx={{ fontWeight: 'normal', minWidth: 90 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'normal', color: 'text.primary' }}>
                                            {item.productName}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                                {item.flow.replace('->', '➜')}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'normal', color: 'error.main' }}>
                                            {item.qty} ชิ้น
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={item.user} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={displayList.length}
                    rowsPerPage={rowsPerPage2}
                    page={page2}
                    onPageChange={handleChangePage2}
                    onRowsPerPageChange={handleChangeRowsPerPage2}
                />
            </Card>

        </Box>
    );
};

export default Discard;