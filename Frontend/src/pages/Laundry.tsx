import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tabs, Tab, Card, CardContent, Chip,
    FormControl, InputLabel, Select, MenuItem,
    Alert, Stack, Autocomplete, TextField, Tooltip
} from '@mui/material';
import {
    LocalLaundryService, Outbound, MoveToInbox,
    Delete, CheckCircle, Refresh, Info, History, Search
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
}

interface WashingItem {
    rfidCode: string;
    productName: string;
    vendorName: string;
    sentDate: string;
}

// Interface for items in Dropdown
interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Laundry: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [washingList, setWashingList] = useState<WashingItem[]>([]);

    // State for Dropdown
    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [searchValue, setSearchValue] = useState<CandidateItem | null>(null);

    useEffect(() => {
        fetchVendors();
        fetchWashingHistory();
    }, []);

    // Load items into Dropdown whenever Tab changes or transaction confirmed
    useEffect(() => {
        fetchCandidates();
    }, [tabValue, washingList]);

    const fetchCandidates = async () => {
        try {
            const mode = tabValue === 0 ? 'send' : 'receive';
            const res = await axiosClient.get(`/Laundry/Candidates/${mode}`);
            setCandidates(res.data);
        } catch (err) { console.error("Load candidates failed", err); }
    };

    const fetchVendors = async () => {
        try {
            const res = await axiosClient.get('/Vendor');
            setVendors(res.data);
        } catch (err) { console.error(err); }
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
    };

    // ✅ Select from Dropdown and add to table immediately
    const handleSelectFromDropdown = (item: CandidateItem | null) => {
        if (!item) return;

        // Check duplicate
        if (scannedItems.find(s => s.rfid === item.rfidCode)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'warning', title: 'รายการนี้เลือกไปแล้ว' });
            setSearchValue(null);
            return;
        }

        // Add to table
        const newItem: ScannedItem = {
            rfid: item.rfidCode,
            productName: item.productName,
            timestamp: new Date()
        };
        setScannedItems(prev => [newItem, ...prev]);

        // Clear input for next selection
        setTimeout(() => setSearchValue(null), 100);
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
                        : { rfidCodes: scannedItems.map(item => item.rfid) }; // Receive back doesn't need VendorId

                    await axiosClient.post(apiEndpoint, payload);

                    Swal.fire('สำเร็จ', `บันทึกเรียบร้อย`, 'success');

                    // 🔔 Notify Admin about Laundry Action
                    if (tabValue === 0) {
                        // Send to Laundry
                        const vendorName = vendors.find(v => v.vendorId === parseInt(selectedVendor))?.vendorName || 'บริษัทรับซัก';
                        await sendNotification(
                            "ส่งผ้าซัก (Send to Laundry)",
                            `มีการส่งผ้าจำนวน ${scannedItems.length} ชิ้น ไปยัง ${vendorName}`,
                            "WARNING", // Use Warning color for outbound
                            "/laundry",
                            undefined,
                            1 // Admin
                        );
                    } else {
                        // Receive from Laundry
                        await sendNotification(
                            "รับผ้ากลับจากซัก (Receive from Laundry)",
                            `รับผ้าสะอาดกลับเข้าคลังจำนวน ${scannedItems.length} ชิ้น`,
                            "SUCCESS", // Use Success color for inbound
                            "/laundry",
                            undefined,
                            1 // Admin
                        );
                    }

                    setScannedItems([]);
                    setSelectedVendor('');
                    fetchWashingHistory();
                    fetchCandidates();

                } catch (err: any) {
                    Swal.fire('Error', err.response?.data?.message || 'Error', 'error');
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
            {/* Header */}
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

            {/* Main Card (Operations) */}
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
                    <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
                        {tabValue === 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>เลือกบริษัทคู่ค้า</InputLabel>
                                    <Select value={selectedVendor} label="เลือกบริษัทคู่ค้า" onChange={(e) => setSelectedVendor(e.target.value)}>
                                        {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12, md: tabValue === 0 ? 6 : 12 }}>
                            <Stack direction="row" alignItems="center" justifyContent="flex-end">
                                <Chip label={`${scannedItems.length} รายการ`} color="primary" sx={{ height: 40, fontSize: '1rem', fontWeight: 'bold', px: 2 }} />
                            </Stack>
                        </Grid>

                        {/* 🔥 Autocomplete Dropdown (Full Width) 🔥 */}
                        <Grid size={{ xs: 12 }}>
                            <Autocomplete
                                fullWidth
                                size="small"
                                value={searchValue}
                                onChange={(event, newValue) => handleSelectFromDropdown(newValue)}
                                options={candidates.filter(c => !scannedItems.find(s => s.rfid === c.rfidCode))}
                                getOptionLabel={(option) => `${option.productName} (${option.rfidCode}) - ${option.status}`}
                                autoHighlight
                                autoSelect
                                blurOnSelect
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={tabValue === 0 ? "ค้นหาผ้าที่จะส่งซัก..." : "ค้นหาผ้าที่กำลังซัก..."}
                                        placeholder="พิมพ์ชื่อสินค้า หรือยิง Scan RFID..."
                                        autoFocus
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: <Search color="action" sx={{ mr: 1 }} />
                                        }}
                                    />
                                )}
                                noOptionsText="ไม่พบรายการที่ตรงเงื่อนไข"
                            />
                        </Grid>
                    </Grid>

                    {scannedItems.length > 0 && (
                        <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
                            <Typography variant="subtitle2" fontWeight="bold">สรุปรายการ:</Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                                {Object.entries(summary).map(([name, count]) => (
                                    <Chip key={name} label={`${name}: ${count}`} size="small" sx={{ bgcolor: 'white' }} />
                                ))}
                            </Box>
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
                                        <TableCell>เวลา</TableCell>
                                        <TableCell align="center">ลบ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scannedItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่ได้เลือกรายการ...</TableCell></TableRow>
                                    ) : (
                                        scannedItems.map((item, index) => (
                                            <TableRow key={item.rfid}>
                                                <TableCell>{scannedItems.length - index}</TableCell>
                                                <TableCell sx={{ maxWidth: 200 }}>
                                                    <Tooltip title={item.rfid}>
                                                        <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="primary" noWrap>
                                                            {item.rfid}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 250 }}>
                                                    <Tooltip title={item.productName}>
                                                        <Typography variant="body2" noWrap>
                                                            {item.productName}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{item.timestamp.toLocaleTimeString('th-TH')}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.rfid)}><Delete /></IconButton>
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
                            ยืนยันรายการ (Confirm)
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Monitor Table */}
            <Card elevation={2} sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                        <History color="action" />
                        <Typography variant="h6" fontWeight="bold">
                            สถานะผ้าที่กำลังส่งซัก (Washing Monitor)
                        </Typography>
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
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>ไม่พบรายการที่กำลังซัก</TableCell>
                                    </TableRow>
                                ) : (
                                    washingList.map((item) => (
                                        <TableRow key={item.rfidCode} hover>
                                            <TableCell sx={{ maxWidth: 150 }}>
                                                <Tooltip title={item.rfidCode}>
                                                    <Typography variant="body2" fontFamily="monospace" noWrap>
                                                        {item.rfidCode}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                <Tooltip title={item.productName}>
                                                    <Typography variant="body2" noWrap>
                                                        {item.productName}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                <Tooltip title={item.vendorName}>
                                                    <Typography variant="body2" noWrap>
                                                        {item.vendorName}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>{item.sentDate ? new Date(item.sentDate).toLocaleString('th-TH') : '-'}</TableCell>
                                            <TableCell align="center">
                                                <Chip label="Washing" color="warning" size="small" variant="outlined" />
                                            </TableCell>
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