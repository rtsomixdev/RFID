import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Grid, Paper, TextField, Button,
    MenuItem, Select, FormControl, InputLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Alert, Stack, Card, CardContent, Tabs, Tab, Divider, Autocomplete,
    Tooltip, useTheme, alpha
} from '@mui/material';
import {
    LocalShipping, QrCodeScanner, CheckCircle, ErrorOutline,
    Delete, Send, Cancel, CallMade, CallReceived, AccessTime,
    Description, SettingsRemote, RestartAlt
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import Swal from 'sweetalert2';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

interface Reader {
    readerId: number;
    readerName: string;
    location: string;
    isActive?: boolean;
}

interface ScannedItem {
    rfid: string;
    productName?: string;
    productId?: number;
    status: 'pending' | 'success' | 'error';
    message?: string;
}

interface RequestItem {
    requestId: number;
    requestCode: string;
    targetWard: { wardId: number; wardName: string };
    requestType: number;
    currentStatusId: number;
    requestItems: {
        id: number;
        quantity: number;
        product: {
            productId: number;
            productName: string;
            sizeSpec: string;
        };
    }[];
}

const Transport: React.FC = () => {
    const theme = useTheme();
    // --- States ---
    const [readers, setReaders] = useState<Reader[]>([]);
    const [selectedReader, setSelectedReader] = useState<string>('');
    const [products, setProducts] = useState<any[]>([]); // เอาไว้เทียบ RFID กับ Product

    // Request States
    const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

    const [inputRfid, setInputRfid] = useState('');
    const [scannedList, setScannedList] = useState<ScannedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (tabValue === 0) {
            fetchPendingRequests();
        } else {
            setSelectedRequest(null);
        }
        setScannedList([]);
        setInputRfid('');
    }, [tabValue]);

    // ✅ Real-time Auto Scan Listener
    useEffect(() => {
        const handleAutoScan = (e: any) => {
            const incomingData = e.detail;
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;
            const readerName = typeof incomingData === 'object' ? incomingData.reader : null;

            console.log(`📡 Transport Auto Scan: ${rfid} from ${readerName}`);

            // Validation
            if (!selectedReader) {
                Swal.fire({ icon: 'warning', title: 'กรุณาเลือก Reader', timer: 1500, showConfirmButton: false });
                return;
            }
            // ถ้าเป็นโหมดส่งของ ต้องเลือกใบคำร้องก่อน
            if (tabValue === 0 && !selectedRequest) {
                Swal.fire({ icon: 'warning', title: 'กรุณาเลือกใบคำร้อง', timer: 1500, showConfirmButton: false });
                return;
            }

            // Check Reader Match
            const currentReaderObj = readers.find(r => r.readerId === parseInt(selectedReader));
            if (currentReaderObj && readerName && currentReaderObj.readerName !== readerName) {
                console.warn(`⚠️ Ignore scan from ${readerName} (Current: ${currentReaderObj.readerName})`);
                return;
            }

            if (rfid) handleAddRfidLogic(rfid);
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => window.removeEventListener("RFID_SCANNED", handleAutoScan);
    }, [selectedReader, selectedRequest, tabValue, readers]);

    const fetchInitialData = async () => {
        try {
            const [readerRes, prodRes] = await Promise.all([
                axiosClient.get('/Reader'),
                axiosClient.get('/Product')
            ]);
            setReaders(readerRes.data);
            setProducts(prodRes.data);

            // Auto Select Online Reader
            if (readerRes.data.length > 0) {
                const online = readerRes.data.find((r: any) => r.isActive);
                setSelectedReader(online ? online.readerId.toString() : readerRes.data[0].readerId.toString());
            }
        } catch (err) { console.error(err); }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await axiosClient.get('/Request');
            const approved = res.data.filter((r: any) => r.currentStatusId === 2); // Approved Only
            setPendingRequests(approved);
        } catch (err) { console.error(err); }
    };

    // 🧠 Smart Logic: พยายามเดาชื่อสินค้าจากรายการในใบคำร้อง (ถ้ามี)
    const guessProductFromRequest = (rfid: string): string => {
        if (!selectedRequest) return '-';
        // Logic นี้เป็นแค่การ Mock เบื้องต้น เพราะ RFID Code ไม่ได้บอก Product ID โดยตรง
        // ในระบบจริงอาจจะต้องมี API: GET /Linen/Check/{rfid} เพื่อดึงชื่อสินค้าจริงมาโชว์
        return '-';
    };

    const handleAddRfidLogic = (code: string) => {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        // Check Duplicate
        if (scannedList.some(item => item.rfid === cleanCode)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'warning', title: 'ซ้ำ!' });
            return;
        }

        const guessedName = guessProductFromRequest(cleanCode);

        setScannedList(prev => [{
            rfid: cleanCode,
            productName: guessedName,
            status: 'pending'
        }, ...prev]);
    };

    // Manual Input Handler
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReader) return Swal.fire('เตือน', 'เลือก Reader ก่อน', 'warning');
        if (tabValue === 0 && !selectedRequest) return Swal.fire('เตือน', 'เลือกใบคำร้องก่อน', 'warning');

        handleAddRfidLogic(inputRfid);
        setInputRfid('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDelete = (rfid: string) => {
        setScannedList(prev => prev.filter(item => item.rfid !== rfid));
    };

    const handleClear = () => {
        setScannedList([]);
        setInputRfid('');
        inputRef.current?.focus();
    };

    const handleSubmit = async () => {
        if (scannedList.length === 0) return;
        if (!selectedReader) return Swal.fire('เตือน', 'กรุณาเลือกจุดสแกน (Reader)', 'warning');
        if (tabValue === 0 && !selectedRequest) return Swal.fire('เตือน', 'กรุณาเลือกใบคำร้อง', 'warning');

        setLoading(true);

        try {
            const rfidsToSend = scannedList.map(item => item.rfid);
            const actionType = tabValue === 0 ? "DISPATCH" : "RECEIVE";

            const payload = {
                rfidCodes: rfidsToSend,
                readerId: parseInt(selectedReader),
                actionType: actionType,
                requestId: selectedRequest?.requestId || null
            };

            const res = await axiosClient.post('/Linen/Scan', payload);

            if (!res.data || !res.data.registered) throw new Error("Invalid response");

            const { registered, unknown, disposed, invalid } = res.data;
            const registeredSet = new Set(registered.map((r: any) => r.rfidCode));
            const unknownSet = new Set(unknown);
            const invalidMap = new Map(invalid?.map((i: any) => [i.rfidCode, i.message]) || []);

            const updatedList = scannedList.map(item => {
                // Update real name from server response
                const regItem = registered.find((r: any) => r.rfidCode === item.rfid);
                const realProductName = regItem?.productName || item.productName;

                if (registeredSet.has(item.rfid)) return { ...item, productName: realProductName, status: 'success', message: 'สำเร็จ' };
                if (unknownSet.has(item.rfid)) return { ...item, status: 'error', message: 'ไม่พบในระบบ' };
                if (invalidMap.has(item.rfid)) return { ...item, status: 'error', message: invalidMap.get(item.rfid) };
                return item;
            });

            setScannedList(updatedList as ScannedItem[]);

            const successCount = registered.length;

            if (successCount > 0) {
                const currentReader = readers.find(r => r.readerId === parseInt(selectedReader));
                const locationName = currentReader ? `${currentReader.readerName}` : 'Unknown';

                if (tabValue === 0) {
                    await sendNotification("กำลังส่งผ้า (In Transit)", `ส่งผ้า ${successCount} ชิ้น ตามคำร้อง ${selectedRequest?.requestCode}`, "WARNING", "/transport", undefined, 1);
                    fetchPendingRequests();
                    // setSelectedRequest(null); // Optional: Keep selected for convenience
                } else {
                    await sendNotification("รับผ้าเข้าคลังปลายทาง", `รับผ้า ${successCount} ชิ้น เข้าสู่ ${locationName} เรียบร้อย`, "SUCCESS", "/transport", undefined, 1);
                }
            }

            Swal.fire({
                icon: successCount > 0 ? 'success' : 'warning',
                title: 'บันทึกผลการสแกน',
                text: `สำเร็จ ${successCount} รายการ`,
                timer: 1500, showConfirmButton: false
            });

        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="ระบบขนส่ง (Transport Logistics)"
                subtitle="จัดการการรับ-ส่งผ้า ตามใบคำร้อง (Request Based)"
                icon={<LocalShipping fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ขนส่ง' }
                ]}
            />

            {/* Tab Selection */}
            <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, v) => setTabValue(v)}
                    variant="fullWidth"
                    indicatorColor={tabValue === 0 ? "primary" : "success"}
                    textColor={tabValue === 0 ? "primary" : "inherit"}
                    sx={{ bgcolor: alpha(tabValue === 0 ? theme.palette.primary.main : theme.palette.success.main, 0.05) }}
                >
                    <Tab icon={<CallMade />} label="1. ส่งของออก (DISPATCH)" />
                    <Tab icon={<CallReceived />} label="2. รับของเข้า (RECEIVE)" />
                </Tabs>
            </Paper>

            <Grid container spacing={3}>
                {/* Left Panel: Controls */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ borderRadius: 3, mb: 3, borderTop: tabValue === 0 ? `5px solid ${theme.palette.primary.main}` : `5px solid ${theme.palette.success.main}`, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom color={tabValue === 0 ? "primary" : "success.main"}>
                                {tabValue === 0 ? "เตรียมส่งของ (ตามใบเบิก)" : "เตรียมรับของเข้า"}
                            </Typography>
                            <Divider sx={{ mb: 3 }} />

                            {/* ✅ Reader Selection */}
                            <FormLabel label="จุดสแกน (Reader)" required>
                                <Select
                                    value={selectedReader}
                                    displayEmpty
                                    onChange={(e) => setSelectedReader(e.target.value)}
                                >
                                    <MenuItem value="" disabled>เลือกจุดสแกน</MenuItem>
                                    {readers.map((r) => (
                                        <MenuItem key={r.readerId} value={r.readerId}>
                                            <Stack direction="row" justifyContent="space-between" width="100%">
                                                {r.readerName}
                                                {r.isActive ? <CheckCircle fontSize="small" color="success" /> : <ErrorOutline fontSize="small" style={{ color: '#ccc' }} />}
                                            </Stack>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormLabel>

                            {/* ✅ Request Selection (Only for Dispatch) */}
                            {tabValue === 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: `1px dashed ${theme.palette.primary.light}`, mb: 2 }}>
                                        <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mb: 1, display: 'block' }}>
                                            <Description sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                            เลือกใบคำร้องที่อนุมัติแล้ว *
                                        </Typography>
                                        <Autocomplete
                                            options={pendingRequests}
                                            getOptionLabel={(option) => `${option.requestCode} - ${option.targetWard?.wardName}`}
                                            value={selectedRequest}
                                            onChange={(e, newVal) => setSelectedRequest(newVal)}
                                            size="medium"
                                            renderInput={(params) => (
                                                <TextField {...params} variant="standard" placeholder="ค้นหาใบคำร้อง..." />
                                            )}
                                            noOptionsText="ไม่มีรายการรอส่ง"
                                        />
                                        {selectedRequest && (
                                            <Alert severity="info" sx={{ mt: 1, py: 0, fontSize: '0.85rem' }}>
                                                ปลายทาง: <strong>{selectedRequest.targetWard?.wardName}</strong>
                                            </Alert>
                                        )}
                                    </Box>

                                    {/* Request Items Table */}
                                    {selectedRequest && (
                                        <Box sx={{ mb: 2, maxHeight: 200, overflowY: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>สินค้า</TableCell>
                                                        <TableCell align="center" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold', width: 80 }}>จำนวน</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {selectedRequest.requestItems.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell sx={{ fontSize: '0.85rem', maxWidth: 150 }}>
                                                                <Tooltip title={item.product.productName}>
                                                                    <Typography variant="body2" fontSize="0.85rem" noWrap>
                                                                        {item.product.productName}
                                                                    </Typography>
                                                                </Tooltip>
                                                                <Typography variant="caption" display="block" color="textSecondary">{item.product.sizeSpec}</Typography>
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                                                {item.quantity}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* ✅ Manual Input */}
                            <form onSubmit={handleManualSubmit}>
                                <FormLabel label="SCAN AREA">
                                    <TextField
                                        inputRef={inputRef}
                                        fullWidth
                                        size="medium"
                                        variant="outlined"
                                        value={inputRfid}
                                        onChange={(e) => setInputRfid(e.target.value)}
                                        placeholder="RFID Code / Barcode"
                                        InputProps={{ endAdornment: <QrCodeScanner color="action" /> }}
                                        autoComplete="off"
                                        disabled={tabValue === 0 && !selectedRequest}
                                    />
                                </FormLabel>
                            </form>

                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button variant="outlined" color="error" onClick={handleClear} disabled={loading}>
                                    <RestartAlt />
                                </Button>
                                <Button
                                    variant="contained"
                                    color={tabValue === 0 ? "primary" : "success"}
                                    fullWidth
                                    size="large"
                                    startIcon={tabValue === 0 ? <Send /> : <CheckCircle />}
                                    onClick={handleSubmit}
                                    disabled={loading || scannedList.length === 0}
                                >
                                    {tabValue === 0 ? "ยืนยันส่งออก" : "ยืนยันรับของ"}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Panel: List */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" fontWeight="bold" color="text.primary">
                                รายการสแกน ({scannedList.length})
                            </Typography>
                            {tabValue === 0
                                ? <Chip label="Mode: Dispatch" size="small" color="primary" variant="filled" />
                                : <Chip label="Mode: Receive" size="small" color="success" variant="filled" />
                            }
                        </Box>

                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>สินค้า (ถ้ามี)</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>ลบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scannedList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                                <AccessTime sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                                                <Typography>
                                                    {tabValue === 0 && !selectedRequest ? "กรุณาเลือกใบคำร้องฝั่งซ้ายก่อน..." : "รอสแกน..."}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        scannedList.map((item, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>{scannedList.length - index}</TableCell>
                                                <TableCell sx={{ maxWidth: 150 }}>
                                                    <Tooltip title={item.rfid}>
                                                        <Typography variant="body2" fontFamily="monospace" fontWeight="bold" noWrap color="primary">
                                                            {item.rfid}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 200, color: 'text.secondary' }}>
                                                    <Tooltip title={item.productName || '-'}>
                                                        <Typography variant="body2" noWrap>
                                                            {item.productName || '-'}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'pending' && <Chip label="รอ..." size="small" />}
                                                    {item.status === 'success' && <Chip label="สำเร็จ" size="small" color="success" icon={<CheckCircle />} />}
                                                    {item.status === 'error' && <Chip label="Error" size="small" color="error" icon={<ErrorOutline />} />}
                                                    {item.message && item.status === 'error' && <Typography variant="caption" color="error" display="block">{item.message}</Typography>}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.status === 'pending' && (
                                                        <Button size="small" color="error" onClick={() => handleDelete(item.rfid)}><Cancel fontSize="small" /></Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Transport;