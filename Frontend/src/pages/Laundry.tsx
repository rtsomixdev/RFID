import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, Typography, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tabs, Tab, Card, CardContent, Chip,
    FormControl, Select, MenuItem,
    Alert, Stack, Autocomplete, TextField, Tooltip, useTheme, alpha
} from '@mui/material';
import {
    LocalLaundryService, Outbound, MoveToInbox,
    Delete, CheckCircle, Refresh, Info, History, Search,
    SettingsRemote, QrCodeScanner, RestartAlt, ErrorOutline
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

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
    rfid: string;
    productName: string;
    location: string;
    status: string;
    updatedAt: string;
}

interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Laundry: React.FC = () => {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);

    // Reader State
    const [readers, setReaders] = useState<any[]>([]);
    const [selectedReader, setSelectedReader] = useState<string>('');

    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    
    // Washing List State (ตารางล่าง)
    const [washingList, setWashingList] = useState<WashingItem[]>([]);

    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [searchValue, setSearchValue] = useState<CandidateItem | null>(null);
    const [rfidInput, setRfidInput] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const scannedItemsRef = useRef<ScannedItem[]>([]);

    useEffect(() => {
        fetchMasterData();
        fetchWashingList();

        // Auto Refresh ตารางล่างทุก 5 วินาที
        const interval = setInterval(fetchWashingList, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [tabValue]);

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
            // เช็คว่า Reader ตรงกับที่เลือกไหม (ถ้าจำเป็น)
            // if (readerName && selectedReader !== readerName) return; 

            if (rfid) handleAddItem(rfid);
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => window.removeEventListener("RFID_SCANNED", handleAutoScan);
    }, [selectedReader, selectedVendor, tabValue, candidates]);

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
                setSelectedReader(onlineReader ? onlineReader.readerId.toString() : readerRes.data[0].readerId.toString());
            }
        } catch (err) { console.error(err); }
    };

    const fetchCandidates = async () => {
        try {
            // ดึงรายชื่อผ้าที่มีสิทธิ์ทำรายการ (Optional)
            // const mode = tabValue === 0 ? 'send' : 'receive';
            // const res = await axiosClient.get(`/Laundry/Candidates/${mode}`);
            // setCandidates(res.data);
        } catch (err) { console.error("Load candidates failed", err); }
    };

    // ✅ ฟังก์ชันดึงข้อมูลตารางด้านล่าง (ดึงจาก Linen Monitor เหมือนหน้า Home)
    const fetchWashingList = async () => {
        try {
            const res = await axiosClient.get('/Linen/Monitor/Latest');
            const data = res.data || [];

            // กรองเอาเฉพาะสถานะที่เกี่ยวข้องกับการซัก
            const filtered = data.filter((item: any) => 
                item.status === 'กำลังซัก' || 
                item.status === 'ส่งซัก' ||
                item.status === 'Washing' ||
                item.location === 'โรงซัก'
            );

            const mappedData: WashingItem[] = filtered.map((item: any) => ({
                rfid: item.rfid,
                productName: item.productName,
                location: item.location,
                status: item.status,
                updatedAt: item.updatedAt
            }));

            setWashingList(mappedData);
        } catch (err) { console.error(err); }
    };


    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setScannedItems([]);
        setSearchValue(null);
        setRfidInput('');
        fetchCandidates();
    };

    const handleAddItem = async (rfid: string) => {
        const cleanRfid = rfid.trim().toUpperCase();
        if (!cleanRfid) return;

        if (scannedItemsRef.current.find(s => s.rfid === cleanRfid)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'warning', title: `รายการ ${cleanRfid} สแกนไปแล้ว` });
            return;
        }

        let productName = 'Unknown Item';
        let status = '';

        // ถ้ามี candidates ให้ลองหาชื่อสินค้าจาก candidates
        // แต่ถ้าไม่มี API candidates ก็จะข้ามไป
        const candidate = candidates.find(c => c.rfidCode === cleanRfid);
        if (candidate) {
            productName = candidate.productName;
            status = candidate.status;
        } else {
             // Fallback: ดึงชื่อสินค้าแบบเร็วๆ (ถ้ามี API)
             try {
                 const res = await axiosClient.get(`/Linen/Search?rfid=${cleanRfid}`);
                 if(res.data && res.data.length > 0) {
                     productName = res.data[0].product?.productName || 'Unknown';
                     status = res.data[0].status;
                 }
             } catch {}
        }

        const newItem: ScannedItem = {
            rfid: cleanRfid,
            productName: productName,
            status: status,
            timestamp: new Date()
        };

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
        // ใช้ Endpoint เดียวกับหน้าอื่นเพื่อความ Consistent หรือจะแยกก็ได้
        // แต่ในที่นี้ผมจะใช้ /Linen/Scan เหมือนหน้า Transport เพื่อให้ Backend จัดการได้ในที่เดียว
        
        Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: `จำนวนทั้งหมด ${scannedItems.length} รายการ`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            confirmButtonColor: theme.palette.primary.main,
            cancelButtonColor: theme.palette.text.secondary
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const actionType = tabValue === 0 ? "WASH" : "RECEIVE"; // WASH = ส่งซัก, RECEIVE = รับกลับ
                    
                    const payload = {
                        rfidCodes: scannedItems.map(item => item.rfid),
                        readerId: parseInt(selectedReader),
                        actionType: actionType
                    };

                    await axiosClient.post('/Linen/Scan', payload);

                    Swal.fire({ icon: 'success', title: 'สำเร็จ', text: `บันทึกเรียบร้อย`, showConfirmButton: false, timer: 1500 });

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
                    fetchWashingList(); // Refresh Table ล่างทันที
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
            <PageHeader
                title="ระบบซักรีด (Laundry Management)"
                subtitle="บันทึกการส่งผ้าเปื้อนไปซัก และรับผ้าสะอาดกลับเข้าคลัง"
                icon={<LocalLaundryService fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ซักรีด' }
                ]}
            />

            <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: 'none', bgcolor: 'transparent', boxShadow: 'none' }}>
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
                        '& .MuiTabs-indicator': { display: 'none' }
                    }}
                >
                    <Tab label="1. ส่งผ้าเปื้อน (Send)" icon={<Outbound fontSize="small" />} iconPosition="start" />
                    <Tab label="2. รับผ้าสะอาด (Receive)" icon={<MoveToInbox fontSize="small" />} iconPosition="start" />
                </Tabs>

                <Card sx={{ mt: -0.2, borderRadius: '0 12px 12px 12px', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={3} alignItems="flex-end" sx={{ mb: 3 }}>
                            <Grid item xs={12} md={4}>
                                <FormLabel label="เลือกเครื่องอ่าน (Reader)" required>
                                    <Select value={selectedReader} onChange={(e) => setSelectedReader(e.target.value)} displayEmpty>
                                        <MenuItem value="" disabled>-- เลือกเครื่องอ่าน --</MenuItem>
                                        {readers.map((r: any) => (
                                            <MenuItem key={r.readerId} value={r.readerId}>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                                                    {r.readerName} {r.isActive ? <CheckCircle fontSize="small" color="success" /> : <ErrorOutline fontSize="small" color="error" />}
                                                </Stack>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormLabel>
                            </Grid>

                            {tabValue === 0 && (
                                <Grid item xs={12} md={4}>
                                    <FormLabel label="เลือกบริษัทคู่ค้า" required>
                                        <Select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)} displayEmpty>
                                            <MenuItem value="" disabled>เลือกบริษัท</MenuItem>
                                            {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                        </Select>
                                    </FormLabel>
                                </Grid>
                            )}

                            <Grid item xs={12} md={tabValue === 0 ? 4 : 8}>
                                <form onSubmit={handleManualInput}>
                                    <FormLabel label="สแกน RFID / ยิงบาร์โค้ด">
                                        <TextField
                                            fullWidth inputRef={inputRef} value={rfidInput} onChange={(e) => setRfidInput(e.target.value)}
                                            placeholder="คลิกแล้วยิง..."
                                            disabled={!selectedReader || (tabValue === 0 && !selectedVendor)}
                                            InputProps={{ startAdornment: <QrCodeScanner fontSize="small" color="action" sx={{ mr: 1 }} /> }}
                                        />
                                    </FormLabel>
                                </form>
                            </Grid>
                        </Grid>

                        {/* Search Box (Optional) */}
                        <Box sx={{ mb: 3 }}>
                             {/* ... (Autocomplete code ถ้าต้องการ) ... */}
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

                        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3, maxHeight: 300 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                        <TableCell sx={{ fontWeight: 600 }}>ลำดับ</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>RFID Code</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>สินค้า</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>สถานะปัจจุบัน</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>เวลา</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>ลบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scannedItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>ยังไม่ได้เลือกรายการ...</TableCell></TableRow>
                                    ) : (
                                        scannedItems.map((item, index) => (
                                            <TableRow key={item.rfid} hover>
                                                <TableCell>{scannedItems.length - index}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>{item.rfid}</TableCell>
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

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                variant="outlined" size="large" onClick={() => setScannedItems([])}
                                disabled={scannedItems.length === 0}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                variant="contained" size="large" onClick={handleSubmit}
                                disabled={scannedItems.length === 0 || (tabValue === 0 && !selectedVendor)}
                                color={tabValue === 0 ? "warning" : "success"}
                                startIcon={tabValue === 0 ? <Outbound /> : <CheckCircle />}
                                sx={{ px: 4 }}
                            >
                                ยืนยันรายการ ({scannedItems.length})
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                        <History color="action" />
                        <Typography variant="h6" fontWeight="bold">สถานะผ้าที่กำลังส่งซัก (Washing Monitor)</Typography>
                        <Chip label={`${washingList.length} รายการ`} size="small" color="warning" />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button startIcon={<Refresh />} size="small" onClick={() => fetchWashingList()}>รีเฟรช</Button>
                    </Stack>
                    <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ชื่อสินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>สถานที่</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>เวลาล่าสุด</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {washingList.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>ไม่พบรายการที่กำลังซัก</TableCell></TableRow>
                                ) : (
                                    washingList.map((item) => (
                                        <TableRow key={item.rfid} hover>
                                            <TableCell sx={{ maxWidth: 150, fontFamily: 'monospace' }}>{item.rfid}</TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>{item.productName}</TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>{item.location}</TableCell>
                                            <TableCell>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('th-TH') : '-'}</TableCell>
                                            <TableCell align="center"><Chip label={item.status} color="warning" size="small" variant="outlined" /></TableCell>
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