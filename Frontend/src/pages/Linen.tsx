import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem,
    Stack, Divider, InputAdornment, Autocomplete, createFilterOptions, Collapse, Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    AppRegistration, Delete, PlaylistAddCheck, QrCodeScanner, RestartAlt,
    AutoFixHigh, LocalLaundryService, Info, Save,
    Category, Straighten, FiberNew
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const filter = createFilterOptions<any>();

const RegisterLinen: React.FC = () => {
    // --- Master Data ---
    const [products, setProducts] = useState<any[]>([]);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // --- Selection State ---
    const [selectedHospital, setSelectedHospital] = useState<string>('');
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [maxWash, setMaxWash] = useState<number>(0);

    // --- Product Hybrid State ---
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);

    // Form สำหรับสินค้าใหม่
    const [newProductData, setNewProductData] = useState({
        productName: '',
        productCode: '',
        categoryName: '',
        sizeSpec: '',
        unitName: 'ชิ้น'
    });

    const [rfidInput, setRfidInput] = useState('');
    const [scannedRfids, setScannedRfids] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const [prodRes, hospRes, vendRes, roomRes, catRes] = await Promise.all([
                axiosClient.get('/Product'),
                axiosClient.get('/Hospital'),
                axiosClient.get('/Vendor'),
                axiosClient.get('/Room'),
                axiosClient.get('/Category')
            ]);
            setProducts(prodRes.data || []);
            setHospitals(hospRes.data || []);
            setVendors(vendRes.data || []);
            setRooms(roomRes.data || []);
            setCategories(catRes.data || []);

            if (hospRes.data.length > 0) setSelectedHospital(hospRes.data[0].hospitalId);
        } catch (err) { console.error("Error loading master data", err); }
    };

    // --- Logic การเลือกสินค้า ---
    const handleProductChange = (_event: any, newValue: any) => {
        if (typeof newValue === 'string') {
            // พิมพ์เองแล้ว Enter
            setIsNewProduct(true);
            setNewProductData(prev => ({ ...prev, productName: newValue }));
            setSelectedProduct(null);
            setMaxWash(100);
        } else if (newValue && newValue.inputValue) {
            // เลือก "Add 'xxx'"
            setIsNewProduct(true);
            setNewProductData(prev => ({ ...prev, productName: newValue.inputValue }));
            setSelectedProduct(null);
            setMaxWash(100);
        } else {
            // เลือกของเดิม
            setIsNewProduct(false);
            setSelectedProduct(newValue);
            if (newValue) {
                setMaxWash(newValue.maxWashCount || 0);
            } else {
                setMaxWash(0);
            }
        }
    };

    // --- Submit Logic (Enhanced Debug Version) ---
    const handleSubmitBatch = async () => {
        // 1. Validation พื้นฐาน
        if (!selectedHospital || !selectedLocation) return Swal.fire('เตือน', 'กรุณาเลือกโรงพยาบาลและสถานที่จัดเก็บ', 'warning');
        if (scannedRfids.length === 0) return Swal.fire('เตือน', 'ไม่มีรายการ RFID ให้บันทึก', 'warning');

        // 2. Validation สำหรับสินค้าใหม่
        if (isNewProduct) {
            if (!newProductData.productName || !newProductData.productName.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุ "ชื่อสินค้า" ในช่องรายละเอียดสินค้าใหม่', 'error');
            if (!newProductData.productCode) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุ "รหัสสินค้า"', 'warning');
            if (!newProductData.categoryName) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุ "หมวดหมู่"', 'warning');
        }

        let finalProductId = selectedProduct?.productId;

        Swal.fire({
            title: 'กำลังบันทึกข้อมูล...',
            text: 'กำลังตรวจสอบกับ Server...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Step A: สร้าง Product ใหม่ (ถ้าต้องสร้าง)
            if (isNewProduct) {
                // 1. เช็คในเครื่องก่อนว่าซ้ำไหม
                const localDuplicate = products.find(p => p.productCode === newProductData.productCode);
                if (localDuplicate) {
                    console.log("Auto-Resume: Found locally:", localDuplicate.productId);
                    finalProductId = localDuplicate.productId;
                } else {
                    // 2. จัดการ Category
                    let finalCategoryId;
                    const existingCat = categories.find(c => c.categoryName === newProductData.categoryName);
                    if (existingCat) {
                        finalCategoryId = existingCat.categoryId;
                    } else {
                        const catRes = await axiosClient.post('/Category', { categoryName: newProductData.categoryName });
                        finalCategoryId = catRes.data.categoryId;
                    }

                    // 3. สร้าง Product
                    try {
                        const payload = {
                            productName: newProductData.productName,
                            productCode: newProductData.productCode,
                            categoryId: finalCategoryId,
                            maxWashCount: Number(maxWash),
                            sizeSpec: newProductData.sizeSpec,
                            unitName: newProductData.unitName,
                            standardWeightKg: 0.5,
                            maxLifespanDays: 365,
                            defaultRoomId: 1
                        };
                        console.log("🚀 Payload ที่ส่งไป:", payload);

                        const prodRes = await axiosClient.post('/Product', payload);
                        finalProductId = prodRes.data.productId;

                    } catch (prodErr: any) {
                        // ถ้า Error 400 ลองเช็คว่าซ้ำจริงไหม (Auto-Healing)
                        if (prodErr.response && prodErr.response.status === 400) {
                            console.warn("⚠️ Create failed, checking server for duplicate...");
                            const refreshRes = await axiosClient.get('/Product');
                            const serverMatch = refreshRes.data.find((p: any) => p.productCode === newProductData.productCode);

                            if (serverMatch) {
                                console.log("✅ Recovered ID:", serverMatch.productId);
                                finalProductId = serverMatch.productId;
                                setProducts(refreshRes.data);
                            } else {
                                // ❌ ถ้าไม่ซ้ำ แต่ Error 400 แสดงว่าข้อมูลผิด (Validation Error) -> โยนให้ข้างล่างจัดการ
                                throw prodErr;
                            }
                        } else {
                            throw prodErr;
                        }
                    }
                }
            }

            // Step B: บันทึก Linen Batch
            const batchPayload = {
                productId: finalProductId,
                hospitalId: parseInt(selectedHospital),
                vendorId: selectedVendor ? parseInt(selectedVendor) : null,
                maxWashCount: Number(maxWash),
                currentLocation: rooms.find(r => r.roomId === parseInt(selectedLocation))?.roomName || '',
                rfidCodes: scannedRfids
            };

            await axiosClient.post('/Linen/RegisterBatch', batchPayload);

            Swal.fire('สำเร็จ', `ลงทะเบียน ${scannedRfids.length} ชิ้น เรียบร้อย`, 'success');

            // Reset
            await fetchMasterData();
            setScannedRfids([]);
            setRfidInput('');
            setIsNewProduct(false);
            setSelectedProduct(null);
            setNewProductData({ productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น' });

        } catch (err: any) {
            console.error("🔥 Error Detail:", err);

            // --- 🛠️ ระบบแกะ Error Message ขั้นเทพ ---
            let errorMsg = 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

            if (err.response && err.response.data) {
                // กรณี Backend ส่ง Validation Error มาเป็นชุด (ASP.NET Default)
                if (err.response.data.errors) {
                    const errorValues = Object.values(err.response.data.errors).flat();
                    errorMsg = `ข้อมูลไม่ถูกต้อง:\n- ${errorValues.join('\n- ')}`;
                }
                // กรณีส่ง message มาตรงๆ
                else if (err.response.data.message) {
                    errorMsg = err.response.data.message;
                }
                // กรณีส่ง title 
                else if (err.response.data.title) {
                    errorMsg = err.response.data.title;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            Swal.fire({
                icon: 'error',
                title: 'บันทึกไม่ผ่าน',
                text: errorMsg, // โชว์ข้อความจริงจาก Server
                footer: 'ลองตรวจสอบข้อมูลที่กรอกอีกครั้ง'
            });
        }
    };

    // --- Helpers ---
    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanRfid = rfidInput.trim();
        if (!cleanRfid) return;
        if (scannedRfids.includes(cleanRfid)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'warning', title: 'รหัสซ้ำ' });
        } else {
            setScannedRfids(prev => [cleanRfid, ...prev]);
        }
        setRfidInput('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleSimulateScan = () => {
        const newMockTags: string[] = [];
        for (let i = 0; i < 5; i++) {
            const randomHex = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
            newMockTags.push(`E200${randomHex}`);
        }
        setScannedRfids(prev => [...newMockTags, ...prev]);
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        display: 'flex'
                    }}
                >
                    <AppRegistration fontSize="large" />
                </Box>
                <Box>
                    <Typography variant="h5" fontWeight="700" color="text.primary">
                        ลงทะเบียนผ้าใหม่ (Batch Registration)
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        จัดการข้อมูลสินค้า ตรวจสอบความถูกต้อง และบันทึกรหัส RFID ลงในระบบ
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* --- Left Column: Registration Form --- */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Card elevation={2} sx={{ borderRadius: 3, border: 'none', overflow: 'visible' }}>
                        <CardContent sx={{ p: 4 }}>

                            {/* Section 1: Hospital & Vendor */}
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h6" fontWeight="600" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Info fontSize="medium" /> ข้อมูลล็อตและคู่ค้า
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>โรงพยาบาลเจ้าของ</InputLabel>
                                            <Select
                                                value={selectedHospital}
                                                label="โรงพยาบาลเจ้าของ"
                                                onChange={e => setSelectedHospital(e.target.value)}
                                            >
                                                {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>บริษัทผู้ผลิต/จำหน่าย (Vendor)</InputLabel>
                                            <Select
                                                value={selectedVendor}
                                                label="บริษัทผู้ผลิต/จำหน่าย (Vendor)"
                                                onChange={e => setSelectedVendor(e.target.value)}
                                            >
                                                <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                                                {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider sx={{ my: 4 }} />

                            {/* Section 2: Product Information */}
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h6" fontWeight="600" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Category fontSize="medium" /> ข้อมูลสินค้า (Product)
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12 }}>
                                        <Autocomplete
                                            fullWidth
                                            size="small"
                                            value={isNewProduct ? newProductData.productName : selectedProduct}
                                            onChange={handleProductChange}
                                            onInputChange={(_, newInputValue) => {
                                                if (isNewProduct) {
                                                    setNewProductData(prev => ({ ...prev, productName: newInputValue }));
                                                }
                                            }}
                                            filterOptions={(options, params) => {
                                                const filtered = filter(options, params);
                                                const { inputValue } = params;
                                                const isExisting = options.some((option) => inputValue === option.productName);
                                                if (inputValue !== '' && !isExisting) {
                                                    filtered.push({ inputValue, productName: `เพิ่มสินค้าใหม่: "${inputValue}"` });
                                                }
                                                return filtered;
                                            }}
                                            selectOnFocus
                                            clearOnBlur
                                            handleHomeEndKeys
                                            options={products}
                                            getOptionLabel={(option) => {
                                                if (typeof option === 'string') return option;
                                                if (option.inputValue) return option.inputValue;
                                                return option.productName;
                                            }}
                                            renderOption={(props, option) => (
                                                <li {...props} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <Typography variant="body2" noWrap>
                                                        {option.productName} {option.productCode ? `(${option.productCode})` : ''}
                                                    </Typography>
                                                </li>
                                            )}
                                            freeSolo
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="ค้นหา หรือ พิมพ์ชื่อสินค้าใหม่"
                                                    placeholder="พิมพ์ชื่อสินค้า..."
                                                    helperText={isNewProduct ? "💡 คุณกำลังสร้างสินค้าใหม่ กรุณากรอกรายละเอียดด้านล่าง" : "เลือกสินค้าที่มีอยู่แล้วในระบบ"}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>

                                {/* New Product Form */}
                                <Collapse in={isNewProduct}>
                                    <Box sx={{ mt: 3, p: 3, bgcolor: '#fff0f5', borderRadius: 2, border: '1px dashed #db2777' }}>
                                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3, color: '#be185d' }}>
                                            <FiberNew fontSize="medium" />
                                            <Typography variant="subtitle1" fontWeight="bold">รายละเอียดสินค้าใหม่</Typography>
                                        </Stack>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    fullWidth
                                                    label="ชื่อสินค้า (ตรวจสอบความถูกต้อง)"
                                                    value={newProductData.productName}
                                                    onChange={e => setNewProductData(prev => ({ ...prev, productName: e.target.value }))}
                                                    required
                                                    error={!newProductData.productName}
                                                    variant="outlined"
                                                    color="secondary"
                                                    focused
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="รหัสสินค้า (Code)"
                                                    value={newProductData.productCode}
                                                    onChange={e => setNewProductData(prev => ({ ...prev, productCode: e.target.value }))}
                                                    required
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    freeSolo
                                                    options={categories.map(c => c.categoryName)}
                                                    value={newProductData.categoryName}
                                                    onChange={(e, newValue) => setNewProductData(prev => ({ ...prev, categoryName: newValue || '' }))}
                                                    renderInput={(params) => <TextField {...params} label="หมวดหมู่" fullWidth />}
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 3 }}>
                                                <TextField
                                                    fullWidth
                                                    label="ขนาด (Size Spec)"
                                                    value={newProductData.sizeSpec}
                                                    onChange={e => setNewProductData(prev => ({ ...prev, sizeSpec: e.target.value }))}
                                                    InputProps={{ startAdornment: <Straighten fontSize="small" sx={{ mr: 1, opacity: 0.5 }} /> }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 3 }}>
                                                <TextField
                                                    fullWidth
                                                    label="หน่วยนับ (Unit)"
                                                    value={newProductData.unitName}
                                                    onChange={e => setNewProductData(prev => ({ ...prev, unitName: e.target.value }))}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Collapse>

                                {/* Existing Product Details */}
                                <Collapse in={!isNewProduct && selectedProduct !== null}>
                                    {selectedProduct && (
                                        <Box sx={{ mt: 3, p: 3, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                            <Grid container spacing={3}>
                                                <Grid size={{ xs: 6, md: 3 }}>
                                                    <Typography variant="caption" color="textSecondary" display="block">รหัสสินค้า</Typography>
                                                    <Typography variant="subtitle1" fontWeight="600">{selectedProduct.productCode}</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 6, md: 3 }}>
                                                    <Typography variant="caption" color="textSecondary" display="block">หมวดหมู่</Typography>
                                                    <Typography variant="subtitle1" fontWeight="600">
                                                        {categories.find(c => c.categoryId === selectedProduct.categoryId)?.categoryName || '-'}
                                                    </Typography>
                                                </Grid>
                                                <Grid size={{ xs: 6, md: 3 }}>
                                                    <Typography variant="caption" color="textSecondary" display="block">ขนาด</Typography>
                                                    <Typography variant="subtitle1" fontWeight="600">{selectedProduct.sizeSpec || '-'}</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 6, md: 3 }}>
                                                    <Typography variant="caption" color="textSecondary" display="block">หน่วยนับ</Typography>
                                                    <Typography variant="subtitle1" fontWeight="600">{selectedProduct.unitName}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}
                                </Collapse>
                            </Box>

                            <Divider sx={{ my: 4 }} />

                            {/* Section 3: Usage & Storage */}
                            <Box>
                                <Typography variant="h6" fontWeight="600" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LocalLaundryService fontSize="medium" /> การใช้งานและการจัดเก็บ
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="อายุการใช้งานสูงสุด (รอบซัก)"
                                            type="number"
                                            value={maxWash}
                                            onChange={e => setMaxWash(Number(e.target.value))}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">รอบ</InputAdornment>
                                            }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 5 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>สถานที่จัดเก็บเริ่มต้น</InputLabel>
                                            <Select
                                                value={selectedLocation}
                                                label="สถานที่จัดเก็บเริ่มต้น"
                                                onChange={e => setSelectedLocation(e.target.value)}
                                            >
                                                {rooms.map(r => <MenuItem key={r.roomId} value={r.roomId}>{r.roomName}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Box>

                        </CardContent>
                    </Card>
                </Grid>

                {/* --- Right Column: Scanning & Actions --- */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card elevation={2} sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>

                            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                                <form onSubmit={handleScan}>
                                    <TextField
                                        inputRef={inputRef}
                                        fullWidth
                                        variant="outlined"
                                        label="Scan RFID"
                                        placeholder="Ready to scan..."
                                        value={rfidInput}
                                        onChange={e => setRfidInput(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            startAdornment: <QrCodeScanner color="primary" sx={{ mr: 1 }} />,
                                            sx: { fontSize: '1.2rem', height: '56px', bgcolor: 'white' }
                                        }}
                                        sx={{ mb: 2 }}
                                    />
                                </form>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleSimulateScan}
                                        startIcon={<AutoFixHigh />}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Simulate Scan
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => setScannedRfids([])}
                                        startIcon={<RestartAlt />}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Clear All
                                    </Button>
                                </Stack>
                            </Box>

                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        รายการที่สแกน
                                    </Typography>
                                    <Typography variant="body2" sx={{ bgcolor: 'secondary.main', color: 'white', px: 1.5, py: 0.5, borderRadius: 10 }}>
                                        {scannedRfids.length} รายการ
                                    </Typography>
                                </Box>

                                <TableContainer sx={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: '400px' }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold' }}>#</TableCell>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold' }}>RFID Code</TableCell>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold' }} align="right">Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {scannedRfids.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                                        <PlaylistAddCheck sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                                                        <Typography variant="body2">รอการสแกน...</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                scannedRfids.map((rfid, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell>{scannedRfids.length - idx}</TableCell>
                                                        <TableCell sx={{ maxWidth: 200 }}>
                                                            <Tooltip title={rfid}>
                                                                <Typography variant="body2" fontFamily="monospace" fontWeight="500" color="primary" noWrap>
                                                                    {rfid}
                                                                </Typography>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton size="small" onClick={() => setScannedRfids(prev => prev.filter(r => r !== rfid))}>
                                                                <Delete fontSize="small" color="error" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleSubmitBatch}
                                disabled={scannedRfids.length === 0}
                                startIcon={<Save />}
                                sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                            >
                                บันทึกข้อมูล ({scannedRfids.length})
                            </Button>

                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RegisterLinen;