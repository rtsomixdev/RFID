import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Card, CardContent, Chip, FormControl, InputLabel, Select, MenuItem, 
  Divider, Stack, Tooltip
} from '@mui/material';
import { 
  AppRegistration, Delete, PlaylistAddCheck, QrCodeScanner, RestartAlt,
  AutoFixHigh // Icon for Test button
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil'; // ✅ Import Utility

const RegisterLinen: React.FC = () => {
  // --- Master Data ---
  const [products, setProducts] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // --- Selection State ---
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');

  // --- Scanning State ---
  const [rfidInput, setRfidInput] = useState('');
  const [scannedRfids, setScannedRfids] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [prodRes, hospRes, vendRes] = await Promise.all([
        axiosClient.get('/Product'),
        axiosClient.get('/Hospital'),
        axiosClient.get('/Vendor')
      ]);
      setProducts(prodRes.data);
      setHospitals(hospRes.data);
      setVendors(vendRes.data);

      if (hospRes.data.length > 0) setSelectedHospital(hospRes.data[0].hospitalId);
    } catch (err) { console.error("Error loading master data", err); }
  };

  // --- Handlers ---

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRfid = rfidInput.trim();
    if (!cleanRfid) return;

    if (scannedRfids.includes(cleanRfid)) {
       const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
       Toast.fire({ icon: 'warning', title: 'รหัสซ้ำ (สแกนไปแล้ว)' });
    } else {
       setScannedRfids(prev => [cleanRfid, ...prev]);
    }
    
    setRfidInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 🎲 Random RFID function for Testing (Generate 5 items)
  const handleSimulateScan = () => {
    if(!selectedProduct) return Swal.fire('เตือน', 'เลือกสินค้าก่อนสุ่มนะจ๊ะ', 'warning');

    const newMockTags: string[] = [];
    for(let i=0; i<5; i++) {
        // Random Hex 20 digits after E200
        const randomHex = Array.from({length: 20}, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
        const mockRfid = `E200${randomHex}`;
        
        // Check duplication
        if(!scannedRfids.includes(mockRfid) && !newMockTags.includes(mockRfid)) {
            newMockTags.push(mockRfid);
        }
    }
    setScannedRfids(prev => [...newMockTags, ...prev]);
  };

  const handleRemove = (rfidToRemove: string) => {
    setScannedRfids(prev => prev.filter(r => r !== rfidToRemove));
  };

  const handleClearAll = () => {
    setScannedRfids([]);
    setRfidInput('');
    inputRef.current?.focus();
  };

  const handleSubmitBatch = async () => {
    if (!selectedProduct) return Swal.fire('เตือน', 'กรุณาเลือกชนิดสินค้า', 'warning');
    if (!selectedHospital) return Swal.fire('เตือน', 'กรุณาเลือกโรงพยาบาล', 'warning');
    if (scannedRfids.length === 0) return Swal.fire('เตือน', 'ไม่มีรายการให้บันทึก', 'warning');

    Swal.fire({
        title: 'ยืนยันการบันทึก?',
        text: `ลงทะเบียนผ้าใหม่ ${scannedRfids.length} ชิ้น เข้าสู่ระบบ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'บันทึกทันที',
        confirmButtonColor: '#166534'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const payload = {
                    productId: parseInt(selectedProduct),
                    hospitalId: parseInt(selectedHospital),
                    vendorId: selectedVendor ? parseInt(selectedVendor) : null,
                    rfidCodes: scannedRfids
                };

                await axiosClient.post('/Linen/RegisterBatch', payload);

                Swal.fire('สำเร็จ', `บันทึก ${scannedRfids.length} รายการเรียบร้อย`, 'success');

                // 🔔 Notify Admin about new stock registration
                const productName = products.find(p => p.productId === parseInt(selectedProduct))?.productName || 'สินค้า';
                await sendNotification(
                    "ลงทะเบียนผ้าใหม่",
                    `มีการลงทะเบียน ${productName} จำนวน ${scannedRfids.length} ชิ้น เข้าสู่ระบบ`,
                    "INFO",
                    "/linens", // Link to inventory page
                    undefined,
                    1 // Send to Admin
                );

                setScannedRfids([]);
                setRfidInput('');
                inputRef.current?.focus();
            } catch (err: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'บันทึกไม่สำเร็จ',
                    text: err.response?.data?.message || 'เกิดข้อผิดพลาด',
                });
            }
        }
    });
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#dcfce7', color: '#166534' }}>
            <AppRegistration fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                ลงทะเบียนผ้าใหม่ (Batch Registration)
            </Typography>
            <Typography variant="body2" color="textSecondary">
                นำเข้าผ้าล็อตใหม่ครั้งละมากๆ (มีปุ่ม Test สุ่มข้อมูลให้)
            </Typography>
        </Box>
      </Box>

      {/* Main Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 3 }}>
            
            {/* 1. Configuration */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>โรงพยาบาลเจ้าของ</InputLabel>
                        <Select value={selectedHospital} label="โรงพยาบาลเจ้าของ" onChange={e => setSelectedHospital(e.target.value)}>
                            {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>บริษัทผู้ผลิต/จำหน่าย</InputLabel>
                        <Select value={selectedVendor} label="บริษัทผู้ผลิต/จำหน่าย" onChange={e => setSelectedVendor(e.target.value)}>
                            <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                            {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small" error={!selectedProduct}>
                        <InputLabel>ชนิดผ้า / สินค้า (Product)</InputLabel>
                        <Select value={selectedProduct} label="ชนิดผ้า / สินค้า (Product)" onChange={e => setSelectedProduct(e.target.value)}>
                            {products.map(p => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {/* 2. Scanning Area */}
            <Box sx={{ mt: 4, bgcolor: '#f8fafc', p: 3, borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <form onSubmit={handleScan}>
                            <TextField 
                                inputRef={inputRef}
                                fullWidth 
                                label={selectedProduct ? "พร้อมสแกน! ยิง RFID ที่นี่..." : "กรุณาเลือกสินค้าด้านบนก่อน..."}
                                placeholder="E200..."
                                value={rfidInput} 
                                onChange={e => setRfidInput(e.target.value)} 
                                disabled={!selectedProduct}
                                autoFocus
                                InputProps={{
                                    startAdornment: <QrCodeScanner color={selectedProduct ? "primary" : "disabled"} sx={{ mr: 1 }} />
                                }}
                                sx={{ bgcolor: 'white' }}
                            />
                        </form>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            {/* 🔥 Test Button */}
                            <Tooltip title="กดเพื่อสุ่ม RFID 5 ชิ้น (สำหรับ Test)">
                                <Button 
                                    variant="outlined" 
                                    color="secondary" 
                                    onClick={handleSimulateScan}
                                    startIcon={<AutoFixHigh />}
                                    disabled={!selectedProduct}
                                >
                                    สุ่ม 5 ชิ้น
                                </Button>
                            </Tooltip>

                            <Chip 
                                label={`${scannedRfids.length} รายการ`} 
                                color={scannedRfids.length > 0 ? "success" : "default"} 
                                sx={{ fontSize: '1.1rem', py: 2.5, px: 1, borderRadius: 2 }} 
                            />
                            {scannedRfids.length > 0 && (
                                <Button startIcon={<RestartAlt />} color="error" onClick={handleClearAll}>
                                    ล้าง
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            {/* 3. Preview Table */}
            {scannedRfids.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <TableContainer sx={{ maxHeight: 300, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ลำดับ</TableCell>
                                    <TableCell>RFID Code</TableCell>
                                    <TableCell>Product</TableCell>
                                    <TableCell align="center">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {scannedRfids.map((rfid, idx) => {
                                    const prod = products.find(p => p.productId === selectedProduct);
                                    return (
                                        <TableRow key={rfid}>
                                            <TableCell>{scannedRfids.length - idx}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#166534' }}>
                                                {rfid}
                                            </TableCell>
                                            <TableCell>{prod?.productName}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" color="error" onClick={() => handleRemove(rfid)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Button 
                        fullWidth 
                        variant="contained" 
                        size="large" 
                        color="success"
                        startIcon={<PlaylistAddCheck />}
                        onClick={handleSubmitBatch}
                        sx={{ mt: 3, py: 1.5, fontSize: '1.1rem', borderRadius: 2 }}
                    >
                        ยืนยันการบันทึก {scannedRfids.length} รายการ
                    </Button>
                </Box>
            )}

        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterLinen;