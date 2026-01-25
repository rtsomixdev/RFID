import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem,
    Stack, Divider, InputAdornment, Autocomplete, createFilterOptions, Collapse
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Use Grid2 explicitly
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
    const [selectedProduct, setSelectedProduct] = useState<any>(null); // Object ของสินค้าที่เลือก
    const [isNewProduct, setIsNewProduct] = useState(false); // Flag บอกว่ากำลังสร้างใหม่ไหม

    // Form สำหรับสินค้าใหม่ (จะโผล่มาเมื่อ isNewProduct = true)
    const [newProductData, setNewProductData] = useState({
        productName: '',
        productCode: '',
        categoryName: '', // พิมพ์ใหม่ได้ หรือเลือกเดิม
        sizeSpec: '',
        unitName: 'ชิ้น'
    });

    // --- Scanning State ---
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

    // --- Logic การเลือกสินค้า (หัวใจสำคัญ) ---
    const handleProductChange = (_event: any, newValue: any) => {
        if (typeof newValue === 'string') {
            // กรณี 1: User พิมพ์เองแล้วกด Enter (เป็นชื่อใหม่)
            setIsNewProduct(true);
            setNewProductData({ ...newProductData, productName: newValue });
            setSelectedProduct(null);
            setMaxWash(100); // Default for new
        } else if (newValue && newValue.inputValue) {
            // กรณี 2: User เลือกจากตัวเลือก "Add 'xxx'" ที่ MUI สร้างให้
            setIsNewProduct(true);
            setNewProductData({ ...newProductData, productName: newValue.inputValue });
            setSelectedProduct(null);
            setMaxWash(100);
        } else {
            // กรณี 3: User เลือกสินค้าที่มีอยู่แล้ว (Existing)
            setIsNewProduct(false);
            setSelectedProduct(newValue);
            // Auto-fill ข้อมูลเดิม
            if (newValue) {
                setMaxWash(newValue.maxWashCount || 0);
            } else {
                setMaxWash(0);
            }
        }
    };

    // --- Submit Logic (Auto Create) ---
    const handleSubmitBatch = async () => {
        if (!selectedHospital || !selectedLocation) return Swal.fire('เตือน', 'กรุณาเลือกโรงพยาบาลและสถานที่จัดเก็บ', 'warning');
        if (scannedRfids.length === 0) return Swal.fire('เตือน', 'ไม่มีรายการ RFID ให้บันทึก', 'warning');

        let finalProductId = selectedProduct?.productId;

        Swal.fire({
            title: 'กำลังบันทึกข้อมูล...',
            text: isNewProduct ? 'กำลังสร้างสินค้าใหม่และลงทะเบียน...' : 'กำลังลงทะเบียน...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Step A: ถ้าเป็นสินค้าใหม่ ต้องสร้าง Product (และ Category) ก่อน
            if (isNewProduct) {
                if (!newProductData.productCode || !newProductData.categoryName) {
                    return Swal.fire('ข้อมูลไม่ครบ', 'สินค้าใหม่ต้องระบุ รหัสสินค้า และ หมวดหมู่', 'warning');
                }

                // 1. หา Category ID หรือ สร้างใหม่
                let finalCategoryId;
                const existingCat = categories.find(c => c.categoryName === newProductData.categoryName);
                if (existingCat) {
                    finalCategoryId = existingCat.categoryId;
                } else {
                    // สร้าง Category ใหม่
                    const catRes = await axiosClient.post('/Category', { categoryName: newProductData.categoryName });
                    finalCategoryId = catRes.data.categoryId;
                }

                // 2. สร้าง Product ใหม่
                const prodRes = await axiosClient.post('/Product', {
                    productName: newProductData.productName,
                    productCode: newProductData.productCode,
                    categoryId: finalCategoryId,
                    maxWashCount: Number(maxWash),
                    sizeSpec: newProductData.sizeSpec,
                    unitName: newProductData.unitName
                });
                finalProductId = prodRes.data.productId;
            }

            // Step B: บันทึก Linen Batch
            const payload = {
                productId: finalProductId,
                hospitalId: parseInt(selectedHospital),
                vendorId: selectedVendor ? parseInt(selectedVendor) : null,
                maxWashCount: Number(maxWash),
                currentLocation: rooms.find(r => r.roomId === parseInt(selectedLocation))?.roomName || '',
                rfidCodes: scannedRfids
            };

            await axiosClient.post('/Linen/RegisterBatch', payload);

            Swal.fire('สำเร็จ', `ลงทะเบียน ${scannedRfids.length} ชิ้น เรียบร้อย`, 'success');

            // Refresh Data
            await fetchMasterData();

            // Reset Form
            setScannedRfids([]);
            setRfidInput('');
            setIsNewProduct(false);
            setSelectedProduct(null);
            setNewProductData({ productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น' });

        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
        }
    };

    // --- Scanning Handlers ---
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
        <Box sx={{ pb: 5 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'flex' }}>
                    <AppRegistration fontSize="large" />
                </Box>
                <Box>
                    <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
                        ลงทะเบียนผ้าใหม่ (Batch Registration)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        ระบบอัจฉริยะ: เลือกสินค้าเดิม หรือ พิมพ์ชื่อใหม่เพื่อสร้างทันที
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Left Column: Configuration */}
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card sx={{ height: '100%', overflow: 'visible', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Info /> ข้อมูลล็อตและคู่ค้า
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid size={12}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>โรงพยาบาลเจ้าของ</InputLabel>
                                        <Select value={selectedHospital} label="โรงพยาบาลเจ้าของ" onChange={e => setSelectedHospital(e.target.value)}>
                                            {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid size={12}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>บริษัทผู้ผลิต/จำหน่าย (Vendor)</InputLabel>
                                        <Select value={selectedVendor} label="บริษัทผู้ผลิต/จำหน่าย (Vendor)" onChange={e => setSelectedVendor(e.target.value)}>
                                            <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                                            {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 4 }} />

                            <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Category /> ข้อมูลสินค้า (Product)
                            </Typography>

                            <Box sx={{ mb: 3 }}>
                                <Grid container spacing={3}>
                                    <Grid size={12}>
                                        <Autocomplete
                                            fullWidth
                                            size="small"
                                            value={isNewProduct ? newProductData.productName : selectedProduct}
                                            onChange={handleProductChange}
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
                                            renderOption={(props, option) => <li {...props}>{option.productName} {option.productCode ? `(${option.productCode})` : ''}</li>}
                                            freeSolo
                                            renderInput={(params) => (
                                                <TextField {...params} label="ค้นหา หรือ พิมพ์ชื่อสินค้าใหม่" size="small"
                                                    helperText={isNewProduct ? "💡 กำลังสร้างสินค้าใหม่" : "เลือกสินค้าที่มีในระบบ"}
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Collapse in={isNewProduct}>
                                <Box sx={{ p: 3, bgcolor: '#fdf2f8', borderRadius: 3, border: '1px dashed #db2777', mb: 3 }}>
                                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2, color: '#be185d' }}>
                                        <FiberNew /> <Typography variant="subtitle2" fontWeight="bold">รายละเอียดสินค้าใหม่</Typography>
                                    </Stack>
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField fullWidth size="small" label="รหัสสินค้า" value={newProductData.productCode} onChange={e => setNewProductData({ ...newProductData, productCode: e.target.value })} required />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Autocomplete
                                                freeSolo
                                                options={categories.map(c => c.categoryName)}
                                                value={newProductData.categoryName}
                                                onChange={(e, newValue) => setNewProductData({ ...newProductData, categoryName: newValue || '' })}
                                                renderInput={(params) => <TextField {...params} label="หมวดหมู่" size="small" />}
                                                size="small"
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField fullWidth size="small" label="ขนาด" value={newProductData.sizeSpec} onChange={e => setNewProductData({ ...newProductData, sizeSpec: e.target.value })}
                                                InputProps={{ startAdornment: <Straighten fontSize="small" sx={{ mr: 1, opacity: 0.5 }} /> }} />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField fullWidth size="small" label="หน่วยนับ" value={newProductData.unitName} onChange={e => setNewProductData({ ...newProductData, unitName: e.target.value })} />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Collapse>

                            <Collapse in={!isNewProduct && selectedProduct !== null}>
                                {selectedProduct && (
                                    <Box sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: 2, border: '1px solid #e2e8f0', mb: 3 }}>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 6 }}><Typography variant="caption" color="textSecondary" display="block">รหัส</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.productCode}</Typography></Grid>
                                            <Grid size={{ xs: 6 }}><Typography variant="caption" color="textSecondary" display="block">หมวดหมู่</Typography><Typography variant="body2" fontWeight="600">{categories.find(c => c.categoryId === selectedProduct.categoryId)?.categoryName}</Typography></Grid>
                                            <Grid size={{ xs: 6 }}><Typography variant="caption" color="textSecondary" display="block">ขนาด</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.sizeSpec || '-'}</Typography></Grid>
                                            <Grid size={{ xs: 6 }}><Typography variant="caption" color="textSecondary" display="block">หน่วย</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.unitName}</Typography></Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Collapse>

                            <Divider sx={{ my: 4 }} />

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth size="small" label="อายุการใช้งาน (รอบซัก)" type="number"
                                        value={maxWash} onChange={e => setMaxWash(Number(e.target.value))}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><LocalLaundryService fontSize="small" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>สถานที่เก็บ</InputLabel>
                                        <Select value={selectedLocation} label="สถานที่เก็บ" onChange={e => setSelectedLocation(e.target.value)}>
                                            {rooms.map(r => <MenuItem key={r.roomId} value={r.roomId}>{r.roomName}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column: Scanning */}
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                            {/* Scan Box */}
                            <Box sx={{ mb: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid size={{ xs: 12, md: 8 }}>
                                        <form onSubmit={handleScan}>
                                            <TextField
                                                inputRef={inputRef}
                                                fullWidth
                                                size="medium"
                                                label="พร้อมสแกน RFID..."
                                                placeholder="E200..."
                                                value={rfidInput} onChange={e => setRfidInput(e.target.value)}
                                                autoFocus
                                                InputProps={{
                                                    startAdornment: <QrCodeScanner color="primary" sx={{ mr: 1.5 }} />,
                                                    sx: { fontSize: '1.2rem', height: '60px' }
                                                }}
                                                sx={{ bgcolor: 'white' }}
                                            />
                                        </form>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="outlined" size="small" onClick={handleSimulateScan} startIcon={<AutoFixHigh />}>
                                            สุ่ม 5 ชิ้น
                                        </Button>
                                        <Button variant="text" size="small" color="error" onClick={() => setScannedRfids([])} startIcon={<RestartAlt />}>
                                            ล้าง
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Table */}
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                    รายการที่สแกนแล้ว ({scannedRfids.length})
                                </Typography>
                                <TableContainer sx={{ maxHeight: 500, border: '1px solid #e2e8f0', borderRadius: 3 }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: 'text.secondary' }}>#</TableCell>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: 'text.secondary' }}>RFID CODE</TableCell>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: 'text.secondary' }}>PRODUCT</TableCell>
                                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: 'text.secondary' }} align="center">ACTION</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {scannedRfids.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                                        <PlaylistAddCheck sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                                                        <Typography>ยังไม่มีรายการสแกน</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : scannedRfids.map((rfid, idx) => (
                                                <TableRow key={idx} hover sx={{ '& td': { py: 1.5 } }}>
                                                    <TableCell sx={{ color: 'text.secondary' }}>{scannedRfids.length - idx}</TableCell>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>{rfid}</TableCell>
                                                    <TableCell sx={{ fontWeight: 500 }}>
                                                        {isNewProduct ? newProductData.productName : (selectedProduct?.productName || '-')}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" onClick={() => setScannedRfids(prev => prev.filter(r => r !== rfid))}>
                                                            <Delete fontSize="small" color="error" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            <Button
                                fullWidth variant="contained" size="large" color="primary"
                                startIcon={<Save />} onClick={handleSubmitBatch}
                                sx={{ mt: 4, py: 1.8, fontSize: '1.1rem' }}
                                disabled={scannedRfids.length === 0}
                            >
                                ยืนยันการบันทึก {scannedRfids.length} รายการ
                            </Button>

                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RegisterLinen;