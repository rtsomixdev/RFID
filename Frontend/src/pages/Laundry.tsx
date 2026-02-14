import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, Typography, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tabs, Tab, Card, CardContent, Chip,
    FormControl, InputLabel, Select, MenuItem,
    Alert, Stack, Autocomplete, TextField, Tooltip
} from '@mui/material';
import {
    LocalLaundryService, Outbound, MoveToInbox,
    Delete, CheckCircle, Refresh, Info, History, Search,
    SettingsRemote, QrCodeScanner, RestartAlt
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

// Interface
interface Vendor {
    vendorId: number;
    vendorName: string;
}

interface ScannedItem {
    rfid: string;
    productName: string;
    timestamp: Date;
    status?: string;
}

interface WashingItem {
    rfidCode: string;
    productName: string;
    vendorName: string;
    sentDate: string;
}

interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Laundry: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    // Reader State
    const [readers, setReaders] = useState<any[]>([]);
    const [selectedReader, setSelectedReader] = useState<string>('');

    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [washingList, setWashingList] = useState<WashingItem[]>([]);

    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [searchValue, setSearchValue] = useState<CandidateItem | null>(null);
    const [rfidInput, setRfidInput] = useState('');
    
    const inputRef = useRef<HTMLInputElement>(null);
    
    // 🔥🔥🔥 1. สร้าง Ref เพื่อเก็บค่า scannedItems ล่าสุด (แก้บั๊ก Stale Closure) 🔥🔥🔥
    const scannedItemsRef = useRef<ScannedItem[]>([]);

    useEffect(() => {
        fetchMasterData();
        fetchWashingHistory();
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [tabValue, washingList]);

    // 🔥🔥🔥 2. อัปเดต Ref ทุกครั้งที่ State เปลี่ยน 🔥🔥🔥
    useEffect(() => {
        scannedItemsRef.current = scannedItems;
    }, [scannedItems]);

    // Real-time Auto Scan Listener
    useEffect(() => {
        const handleAutoScan = (e: any) => {
            const incomingData = e.detail; 
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;
            const readerName = typeof incomingData === 'object' ? incomingData.reader : null;

            console.log(`📡 Laundry Auto Scan: ${rfid} from ${readerName}`);

            if (!selectedReader) {
                Swal.fire({ icon: 'warning', title: 'กรุณาเลือก Reader', timer: 1500, showConfirmButton: false });
                return;
            }
            if (tabValue === 0 && !selectedVendor) {
                Swal.fire({ icon: 'warning', title: 'กรุณาเลือกบริษัทคู่ค้า', timer: 1500, showConfirmButton: false });
                return;
            }
            if (readerName && selectedReader !== readerName) return;

            // เรียก handleAddItem โดยส่งค่า rfid ไป
            if (rfid) handleAddItem(rfid);
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => window.removeEventListener("RFID_SCANNED", handleAutoScan);
    }, [selectedReader, selectedVendor, tabValue, candidates]); // ลบ scannedItems ออกจาก dependency เพราะเราใช้ Ref แล้ว

    const fetchMasterData = async () => {
        try {
            const [vendRes, readerRes] = await Promise.all([
                axiosClient.get('/Vendor'),
                axiosClient.get('/Reader')
            ]);
            setVendors(vendRes.data);
            setReaders(readerRes.data);

            if (readerRes.data.length > 0) {
                const onlineReader = readerRes.data.find((r: any) => r.isActive);
                setSelectedReader(onlineReader ? onlineReader.readerName : readerRes.data[0].readerName);
            }
        } catch (err) { console.error(err); }
    };

    const fetchCandidates = async () => {
        try {
            const mode = tabValue === 0 ? 'send' : 'receive';
            const res = await axiosClient.get(`/Laundry/Candidates/${mode}`);
            setCandidates(res.data);
        } catch (err) { console.error("Load candidates failed", err); }
    };

    const fetchWashingHistory = async () => {
        try {
            const res = await axiosClient.get('/Laundry/History');
            setWashingList(res.data);
        } catch (err) { console.error(err); }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setScannedItems([]);
        setSearchValue(null);
        setRfidInput('');
        fetchCandidates();
    };

    // ✅ ฟังก์ชันเพิ่มรายการ (แก้บั๊ก Duplicate + Unknown)
    const handleAddItem = async (rfid: string) => {
        const cleanRfid = rfid.trim().toUpperCase();
        if (!cleanRfid) return;

        // 🔥🔥🔥 3. ใช้ Ref เช็คค่าซ้ำ แทน State (แก้บั๊กสแกนซ้ำได้แล้ว!) 🔥🔥🔥
        if (scannedItemsRef.current.find(s => s.rfid === cleanRfid)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'warning', title: `รายการ ${cleanRfid} สแกนไปแล้ว` });
            return; // จบการทำงานทันที ไม่เพิ่มซ้ำ
        }

        let productName = 'Unknown Item';
        let status = '';

        // ลองหาใน Candidates (Local Memory)
        const candidate = candidates.find(c => c.rfidCode === cleanRfid);
        
        if (candidate) {
            productName = candidate.productName;
            status = candidate.status;
        } else {
            // ถ้าไม่เจอ ให้วิ่งไปถาม Backend (แก้บั๊ก Unknown)
            try {
                const res = await axiosClient.get(`/Laundry/Check/${cleanRfid}`);
                if (res.data) {
                    productName = res.data.productName;
                    status = res.data.status;
                }
            } catch (err) {
                console.warn(`Tag ${cleanRfid} not found anywhere.`);
            }
        }

        // เพิ่มลงตาราง
        const newItem: ScannedItem = {
            rfid: cleanRfid,
            productName: productName,
            status: status,
            timestamp: new Date()
        };
        
        // อัปเดต State (ซึ่งจะไปอัปเดต Ref ผ่าน useEffect เอง)
        setScannedItems(prev => [newItem, ...prev]);
    };

    const handleSelectFromDropdown = (item: CandidateItem | null) => {
        if (!item) return;
        handleAddItem(item.rfidCode);
        setTimeout(() => setSearchValue(null), 100);
    };

    const handleManualInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReader) return Swal.fire('เตือน', 'กรุณาเลือก Reader ก่อน', 'warning');
        if (tabValue === 0 && !selectedVendor) return Swal.fire('เตือน', 'กรุณาเลือกบริษัทคู่ค้า', 'warning');
        
        handleAddItem(rfidInput);
        setRfidInput('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleRemoveItem = (rfid: string) => {
        setScannedItems(prev => prev.filter(item => item.rfid !== rfid));
    };

    const handleSubmit = async () => {
        if (tabValue === 0 && !selectedVendor) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกบริษัทคู่ค้า', 'warning');
        if (scannedItems.length === 0) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายการผ้า', 'warning');

        const actionText = tabValue === 0 ? 'ส่งซัก' : 'รับผ้ากลับ';
        const apiEndpoint = tabValue === 0 ? '/Laundry/Send' : '/Laundry/Receive';

        Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: `จำนวนทั้งหมด ${scannedItems.length} รายการ`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            confirmButtonColor: '#0ea5e9'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = tabValue === 0
                        ? { vendorId: selectedVendor ? parseInt(selectedVendor) : 0, rfidCodes: scannedItems.map(item => item.rfid) }
                        : { rfidCodes: scannedItems.map(item => item.rfid) }; 

                    await axiosClient.post(apiEndpoint, payload);

                    Swal.fire('สำเร็จ', `บันทึกเรียบร้อย`, 'success');

                    // Notify
                    if (tabValue === 0) {
                        const vendorName = vendors.find(v => v.vendorId === parseInt(selectedVendor))?.vendorName || 'บริษัทรับซัก';
                        await sendNotification(
                            "ส่งผ้าซัก (Send to Laundry)",
                            `มีการส่งผ้าจำนวน ${scannedItems.length} ชิ้น ไปยัง ${vendorName}`,
                            "WARNING", "/laundry", undefined, 1
                        );
                    } else {
                        await sendNotification(
                            "รับผ้ากลับจากซัก (Receive from Laundry)",
                            `รับผ้าสะอาดกลับเข้าคลังจำนวน ${scannedItems.length} ชิ้น`,
                            "SUCCESS", "/laundry", undefined, 1
                        );
                    }

                    setScannedItems([]);
                    fetchWashingHistory();
                    fetchCandidates();

                } catch (err: any) {
                    Swal.fire('ทำรายการไม่ได้', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    };

    const summary = scannedItems.reduce((acc, item) => {
        acc[item.productName] = (acc[item.productName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Box sx={{ pb: 5 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
                    <LocalLaundryService fontSize="large" />
                </Paper>
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                        ระบบซักรีด (Laundry Management)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        บันทึกการส่งผ้าเปื้อนไปซัก และรับผ้าสะอาดกลับเข้าคลัง
                    </Typography>
                </Box>
            </Box>

            <Card elevation={2} sx={{ mb: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}
                    variant="fullWidth"
                >
                    <Tab label="1. ส่งผ้าเปื้อน (Send)" icon={<Outbound />} iconPosition="start" />
                    <Tab label="2. รับผ้าสะอาด (Receive)" icon={<MoveToInbox />} iconPosition="start" />
                </Tabs>

                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>เลือกเครื่องอ่าน (Reader) *</InputLabel>
                                <Select value={selectedReader} label="เลือกเครื่องอ่าน (Reader) *" onChange={(e) => setSelectedReader(e.target.value)}>
                                    {readers.map((r: any) => (
                                        <MenuItem key={r.readerId} value={r.readerName}>
                                            {r.readerName} {r.isActive ? '🟢' : '🔴'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {tabValue === 0 && (
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>เลือกบริษัทคู่ค้า *</InputLabel>
                                    <Select value={selectedVendor} label="เลือกบริษัทคู่ค้า *" onChange={(e) => setSelectedVendor(e.target.value)}>
                                        {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} md={tabValue === 0 ? 4 : 8}>
                            <form onSubmit={handleManualInput}>
                                <TextField
                                    fullWidth size="small" inputRef={inputRef} value={rfidInput} onChange={(e) => setRfidInput(e.target.value)}
                                    label="สแกน RFID / ยิงบาร์โค้ด" placeholder="คลิกแล้วยิง..."
                                    disabled={!selectedReader || (tabValue === 0 && !selectedVendor)}
                                    InputProps={{ startAdornment: <QrCodeScanner fontSize="small" color="action" sx={{ mr: 1 }} /> }}
                                />
                            </form>
                        </Grid>
                    </Grid>

                    <Box sx={{ mb: 3 }}>
                        <Autocomplete
                            fullWidth size="small" value={searchValue}
                            onChange={(event, newValue) => handleSelectFromDropdown(newValue)}
                            options={candidates.filter(c => !scannedItems.find(s => s.rfid === c.rfidCode))}
                            getOptionLabel={(option) => `${option.productName} (${option.rfidCode}) - ${option.status}`}
                            renderInput={(params) => (
                                <TextField {...params} label={tabValue === 0 ? "ค้นหาผ้าที่จะส่งซัก (จากระบบ)" : "ค้นหาผ้าที่กำลังซัก (จากระบบ)"} placeholder="พิมพ์ชื่อสินค้า..." InputProps={{ ...params.InputProps, startAdornment: <Search color="action" sx={{ mr: 1 }} /> }} />
                            )}
                            noOptionsText="ไม่พบรายการที่ตรงเงื่อนไข"
                        />
                    </Box>

                    {scannedItems.length > 0 && (
                        <Alert severity="info" sx={{ mb: 3, py: 0 }} icon={<Info />}>
                            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ py: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mr: 1 }}>สรุปรายการ:</Typography>
                                {Object.entries(summary).map(([name, count]) => (
                                    <Chip key={name} label={`${name}: ${count}`} size="small" sx={{ bgcolor: 'white', border: '1px solid #bae6fd' }} />
                                ))}
                                <Box sx={{ flexGrow: 1 }} />
                                <Button size="small" color="error" startIcon={<RestartAlt />} onClick={() => setScannedItems([])}>ล้างรายการ</Button>
                            </Stack>
                        </Alert>
                    )}

                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                        <TableContainer sx={{ maxHeight: 300 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ลำดับ</TableCell>
                                        <TableCell>RFID Code</TableCell>
                                        <TableCell>สินค้า</TableCell>
                                        <TableCell>สถานะปัจจุบัน</TableCell>
                                        <TableCell>เวลา</TableCell>
                                        <TableCell align="center">ลบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scannedItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่ได้เลือกรายการ...</TableCell></TableRow>
                                    ) : (
                                        scannedItems.map((item, index) => (
                                            <TableRow key={item.rfid} hover>
                                                <TableCell>{scannedItems.length - index}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold' }}>{item.rfid}</TableCell>
                                                <TableCell sx={{ maxWidth: 250 }}>{item.productName}</TableCell>
                                                <TableCell>
                                                    {item.status ? <Chip label={item.status} size="small" variant="outlined" color={item.status === 'Available' ? 'success' : 'default'} /> : '-'}
                                                </TableCell>
                                                <TableCell>{item.timestamp.toLocaleTimeString('th-TH')}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.rfid)}><Delete fontSize="small" /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained" size="large" onClick={handleSubmit}
                            disabled={scannedItems.length === 0 || (tabValue === 0 && !selectedVendor)}
                            color={tabValue === 0 ? "error" : "success"}
                            startIcon={tabValue === 0 ? <Outbound /> : <CheckCircle />}
                            sx={{ px: 4, py: 1.2, fontSize: '1.1rem', borderRadius: 2 }}
                        >
                            ยืนยันรายการ ({scannedItems.length})
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={2} sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                        <History color="action" />
                        <Typography variant="h6" fontWeight="bold">สถานะผ้าที่กำลังส่งซัก (Washing Monitor)</Typography>
                        <Chip label={`${washingList.length} รายการ`} size="small" color="warning" />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button startIcon={<Refresh />} size="small" onClick={() => { fetchWashingHistory(); fetchCandidates(); }}>รีเฟรช</Button>
                    </Stack>
                    <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อสินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ส่งไปร้าน</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>เวลาที่ส่ง</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {washingList.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>ไม่พบรายการที่กำลังซัก</TableCell></TableRow>
                                ) : (
                                    washingList.map((item) => (
                                        <TableRow key={item.rfidCode} hover>
                                            <TableCell sx={{ maxWidth: 150, fontFamily: 'monospace' }}>{item.rfidCode}</TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>{item.productName}</TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>{item.vendorName}</TableCell>
                                            <TableCell>{item.sentDate ? new Date(item.sentDate).toLocaleString('th-TH') : '-'}</TableCell>
                                            <TableCell align="center"><Chip label="Washing" color="warning" size="small" variant="outlined" /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box >
    );
};

export default Laundry;