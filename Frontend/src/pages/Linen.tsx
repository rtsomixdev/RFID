import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Card, CardContent, Select, MenuItem,
    Stack, InputAdornment, Autocomplete, createFilterOptions, Collapse, Alert, Chip, Paper,
    useTheme, alpha, Divider, Grid, Switch, FormControlLabel
} from '@mui/material';
import {
    AppRegistration, Delete, PlaylistAddCheck, QrCodeScanner, RestartAlt,
    LocalLaundryService, Info, Save,
    Category, FiberNew,
    CheckCircle, ErrorOutline, AddCircleOutline, Room,
    Straighten, Scale, CalendarToday, Palette, DeleteSweep, SettingsRemote
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';
import ReaderWakeButton from '../components/ReaderWakeButton';

const filter = createFilterOptions<any>();

interface Product {
    productId: number;
    productName: string;
    productCode: string;
    categoryId: number;
    sizeSpec?: string;
    unitName: string;
    maxWashCount?: number;
    standardWeightKg?: number; 
    maxLifespanDays?: number;  
    color?: string; 
    isDisposable?: boolean; 
    [key: string]: any;
}

interface Reader {
    readerId: number;
    readerName: string;
    isActive: boolean;
    location?: string;
}

interface LocationItem {
    roomId: number;
    roomName: string;
}

const RegisterLinen: React.FC = () => {
    const theme = useTheme();

    // ✅ การเช็คสิทธิ์แบบละเอียด
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const permissions = currentUser?.permissions || currentUser?.Permissions || [];
    const roleId = currentUser?.roleId || currentUser?.RoleId || 0;
    
    // Admin (1) ผ่านหมด หรือต้องมีสิทธิ์ WRITE_LINEN ถึงจะเพิ่มผ้าได้
    const canWrite = roleId === 1 || permissions.includes('WRITE_LINEN');

    // --- Master Data ---
    const [products, setProducts] = useState<Product[]>([]);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [rooms, setRooms] = useState<LocationItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [readers, setReaders] = useState<Reader[]>([]);

    // --- Selection State ---
    const [selectedHospital, setSelectedHospital] = useState<string>('');
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [selectedReader, setSelectedReader] = useState<string>('');
    const [isReaderOnline, setIsReaderOnline] = useState(false);
    
    const [maxWash, setMaxWash] = useState<number>(100);

    // --- Product Hybrid State ---
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);

    const [newProductData, setNewProductData] = useState({
        productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น',
        standardWeightKg: '', maxLifespanDays: '', color: '', isDisposable: false 
    });

    const [rfidInput, setRfidInput] = useState('');
    const [scannedRfids, setScannedRfids] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Initialization ---
    useEffect(() => {
        fetchMasterData();
        
        const interval = setInterval(() => {
            fetchReadersOnly();
        }, 5000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedReader && readers.length > 0) {
            const reader = readers.find(r => r.readerName === selectedReader);
            setIsReaderOnline(reader ? !!reader.isActive : false);
        }
    }, [selectedReader, readers]);

    // --- Real-time Scan Listener ---
    useEffect(() => {
        const handleAutoScan = (e: any) => {
            const incomingData = e.detail;
            const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;

            if (!canWrite) {
                toastWarning('คุณไม่มีสิทธิ์ในการลงทะเบียนผ้าใหม่');
                return;
            }
            if (!selectedReader) {
                toastWarning('กรุณาเลือกเครื่องอ่านก่อนเริ่มสแกน');
                return;
            }
            if (!selectedHospital) {
                toastWarning('กรุณาเลือกโรงพยาบาลก่อน');
                return;
            }

            if (rfid) {
                addRfidToList(rfid);
            }
        };

        window.addEventListener("RFID_SCANNED", handleAutoScan);
        return () => window.removeEventListener("RFID_SCANNED", handleAutoScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedReader, selectedHospital, scannedRfids, canWrite]);

    const toastWarning = (msg: string) => {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'warning', title: msg });
    };

    const addRfidToList = (rfid: string) => {
        const cleanRfid = rfid.trim();
        if (!cleanRfid) return;

        setScannedRfids(prev => {
            if (prev.includes(cleanRfid)) {
                toastWarning(`รหัสซ้ำ: ${cleanRfid}`);
                return prev;
            }
            return [cleanRfid, ...prev];
        });
    };

    // --- API Calls ---
    const fetchMasterData = async () => {
        const fetchData = async (url: string, setter: Function) => {
            try {
                const res = await axiosClient.get(url);
                setter(res.data || []);
                return res.data;
            } catch (err) {
                console.error(`Error loading ${url}`, err);
                return [];
            }
        };

        await fetchData('/Product', setProducts);
        await fetchData('/Vendor', setVendors);
        await fetchData('/Category', setCategories);

        try {
            const resWard = await axiosClient.get('/Ward');
            const dataWard = resWard.data || [];
            const formattedRooms = dataWard.map((item: any, index: number) => ({
                roomId: item.wardId || item.id || index,
                roomName: item.wardName || item.name || ''
            }));
            setRooms(formattedRooms);
        } catch (err) {
            try {
                const resLoc = await axiosClient.get('/Location');
                const dataLoc = resLoc.data || [];
                const formattedFallback = dataLoc.map((item: any, index: number) => ({
                    roomId: item.locationId || item.id || index,
                    roomName: item.locationName || item.name || ''
                }));
                setRooms(formattedFallback);
            } catch (fallbackErr) {
                 console.error("Failed to fetch locations", fallbackErr);
            }
        }

        const hospData = await fetchData('/Hospital', setHospitals);
        if (hospData.length > 0 && !selectedHospital) setSelectedHospital(hospData[0].hospitalId);

        const readerData = await fetchData('/Reader', setReaders);
        if (readerData.length > 0 && !selectedReader) {
            const active = readerData.find((r: Reader) => r.isActive);
            if (active) {
                setSelectedReader(active.readerName);
                if (active.location && rooms.length > 0) {
                    const matchedRoom = rooms.find(r => r.roomName === active.location);
                    if (matchedRoom) setSelectedLocation(matchedRoom.roomId.toString());
                }
            }
        }
    };

    const fetchReadersOnly = async () => {
        try {
            const res = await axiosClient.get('/Reader');
            setReaders(res.data || []);
        } catch (err) { console.error(err); }
    };

    // --- Event Handlers ---
    const handleReaderChange = (event: any) => {
        const readerName = event.target.value;
        setSelectedReader(readerName);

        const targetReader = readers.find(r => r.readerName === readerName);
        if (targetReader && targetReader.location) {
            const matchedRoom = rooms.find(r => r.roomName === targetReader.location);
            if (matchedRoom) {
                setSelectedLocation(matchedRoom.roomId.toString());
                const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'info', title: `ปรับสถานที่ตามเครื่องอ่าน: ${matchedRoom.roomName}` });
            }
        }
    };

    const handleProductChange = (_event: any, newValue: any) => {
        if (typeof newValue === 'string') {
            setIsNewProduct(true);
            setNewProductData(prev => ({ ...prev, productName: newValue }));
            setSelectedProduct(null);
        } else if (newValue && newValue.inputValue) {
            setIsNewProduct(true);
            setNewProductData(prev => ({ ...prev, productName: newValue.inputValue }));
            setSelectedProduct(null);
        } else {
            setIsNewProduct(false);
            setSelectedProduct(newValue);
            if (newValue) {
                setMaxWash(newValue.maxWashCount || 100);
            }
        }
    };

    const handleManualInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) return Swal.fire('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์ลงทะเบียนผ้าเข้าระบบ', 'error');
        if (!selectedReader || !selectedHospital) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือก Reader และ โรงพยาบาลก่อน', 'warning');
        addRfidToList(rfidInput);
        setRfidInput('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // --- Submit Logic ---
    const handleSubmitBatch = async () => {
        if (!canWrite) return Swal.fire('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์ลงทะเบียนผ้าเข้าระบบ', 'error');
        if (!selectedHospital || !selectedLocation) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุ โรงพยาบาล และ สถานที่จัดเก็บ', 'warning');
        if (scannedRfids.length === 0) return Swal.fire('ไม่มีข้อมูล', 'กรุณาสแกน RFID อย่างน้อย 1 รายการ', 'warning');

        if (isNewProduct) {
            if (!newProductData.productName?.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'ระบุชื่อสินค้า', 'warning');
            if (!newProductData.productCode?.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'ระบุรหัสสินค้า', 'warning');
            if (!newProductData.categoryName) return Swal.fire('ข้อมูลไม่ครบ', 'ระบุหมวดหมู่', 'warning');
        } else if (!selectedProduct) {
            return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกสินค้า', 'warning');
        }

        Swal.fire({
            title: 'กำลังบันทึกข้อมูล...',
            html: 'กรุณารอสักครู่ ห้ามปิดหน้าต่าง',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            let finalProductId = selectedProduct?.productId;

            if (isNewProduct) {
                const dup = products.find(p => p.productCode === newProductData.productCode);
                if (dup) {
                    finalProductId = dup.productId;
                } else {
                    let catId;
                    const existCat = categories.find(c => c.categoryName === newProductData.categoryName);
                    if (existCat) {
                        catId = existCat.categoryId;
                    } else {
                        const catRes = await axiosClient.post('/Category', { categoryName: newProductData.categoryName });
                        catId = catRes.data.categoryId;
                    }

                    const prodRes = await axiosClient.post('/Product', {
                        productName: newProductData.productName,
                        productCode: newProductData.productCode,
                        categoryId: catId,
                        sizeSpec: newProductData.sizeSpec,
                        unitName: newProductData.unitName,
                        maxWashCount: Number(maxWash),
                        standardWeightKg: newProductData.standardWeightKg ? Number(newProductData.standardWeightKg) : 0, 
                        maxLifespanDays: newProductData.maxLifespanDays ? Number(newProductData.maxLifespanDays) : 365,
                        color: newProductData.color, 
                        isDisposable: newProductData.isDisposable, 
                        defaultRoomId: selectedLocation ? parseInt(selectedLocation) : 1
                    });
                    finalProductId = prodRes.data.productId;
                }
            }

            const locationObj = rooms.find(r => r.roomId === parseInt(selectedLocation));
            const finalLocationName = locationObj ? locationObj.roomName : 'คลังผ้าสะอาด'; 

            await axiosClient.post('/Linen/RegisterBatch', {
                productId: finalProductId,
                hospitalId: parseInt(selectedHospital),
                vendorId: selectedVendor ? parseInt(selectedVendor) : null,
                maxWashCount: Number(maxWash),
                currentLocation: finalLocationName, 
                rfidCodes: scannedRfids
            });

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ!',
                text: `ลงทะเบียนผ้าเข้าสู่ "${finalLocationName}" เรียบร้อย`,
                timer: 2000
            });

            setScannedRfids([]);
            setRfidInput('');
            setIsNewProduct(false);
            setSelectedProduct(null);
            
            setNewProductData({ 
                productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น',
                standardWeightKg: '', maxLifespanDays: '', color: '', isDisposable: false
            });

            fetchMasterData();

        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่'
            });
        }
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="ลงทะเบียนผ้าใหม่ (New Linen Registration)"
                subtitle="จัดการข้อมูลสินค้าและบันทึกรหัส RFID ลงในระบบ"
                icon={<AppRegistration fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ลงทะเบียนผ้า' }
                ]}
            />

            {!canWrite && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    คุณกำลังอยู่ในโหมด "ดูข้อมูลเท่านั้น" เนื่องจากไม่มีสิทธิ์เพิ่มผ้าเข้าสู่ระบบ
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Stack spacing={3}>
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight="700" color="primary.main" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Info /> ข้อมูลล็อตและสถานที่ (Lot & Location)
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <FormLabel label="โรงพยาบาลเจ้าของ" required>
                                            <Select fullWidth value={selectedHospital} displayEmpty onChange={e => setSelectedHospital(e.target.value)} disabled={!canWrite}>
                                                <MenuItem value="" disabled>เลือกโรงพยาบาล</MenuItem>
                                                {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                                            </Select>
                                        </FormLabel>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormLabel label="สถานที่จัดเก็บเริ่มต้น" required>
                                            <Select fullWidth value={selectedLocation} displayEmpty onChange={e => setSelectedLocation(e.target.value)} disabled={!canWrite}>
                                                <MenuItem value="" disabled>เลือกสถานที่</MenuItem>
                                                {rooms.map(r => <MenuItem key={r.roomId} value={r.roomId}>{r.roomName}</MenuItem>)}
                                            </Select>
                                        </FormLabel>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormLabel label="บริษัทผู้ผลิต/จำหน่าย (Vendor)">
                                            <Select fullWidth value={selectedVendor} displayEmpty onChange={e => setSelectedVendor(e.target.value)} disabled={!canWrite}>
                                                <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                                                {vendors.map(v => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                                            </Select>
                                        </FormLabel>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'visible' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight="700" color="primary.main" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Category /> ข้อมูลสินค้า (Product Info)
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <FormLabel label="ค้นหาหรือสร้างสินค้าใหม่" required>
                                            <Autocomplete
                                                fullWidth size="small" disabled={!canWrite}
                                                value={isNewProduct ? newProductData.productName : selectedProduct}
                                                onChange={handleProductChange}
                                                onInputChange={(_, newInputValue) => { if (isNewProduct) setNewProductData(prev => ({ ...prev, productName: newInputValue })); }}
                                                filterOptions={(options, params) => {
                                                    const filtered = filter(options, params);
                                                    const { inputValue } = params;
                                                    const isExisting = options.some((option) => inputValue === option.productName);
                                                    if (inputValue !== '' && !isExisting) {
                                                        filtered.push({ inputValue, productName: `➕ เพิ่มสินค้าใหม่: "${inputValue}"` });
                                                    }
                                                    return filtered;
                                                }}
                                                selectOnFocus clearOnBlur handleHomeEndKeys options={products}
                                                getOptionLabel={(option) => {
                                                    if (typeof option === 'string') return option;
                                                    if (option.inputValue) return option.inputValue;
                                                    return option.productName;
                                                }}
                                                renderOption={(props, option) => (
                                                    <li {...props}>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">{option.productName}</Typography>
                                                            {option.productCode && <Typography variant="caption" color="text.secondary">Code: {option.productCode}</Typography>}
                                                        </Box>
                                                    </li>
                                                )}
                                                freeSolo
                                                renderInput={(params) => <TextField {...params} fullWidth placeholder="พิมพ์ชื่อสินค้า..." />}
                                            />
                                        </FormLabel>
                                    </Grid>
                                </Grid>

                                {/* ✅ ดึงข้อมูลที่ซ่อนอยู่กลับมาให้ครบถ้วนในโหมดสินค้าเก่า */}
                                <Collapse in={!isNewProduct && selectedProduct !== null}>
                                    {selectedProduct && (
                                        <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 2 }}>
                                                {selectedProduct.productName} 
                                                {selectedProduct.isDisposable && <Chip label="ใช้แล้วทิ้ง" color="warning" size="small" sx={{ ml: 2, height: 20 }} />}
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}><Typography variant="caption" color="textSecondary">รหัสสินค้า</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.productCode}</Typography></Grid>
                                                <Grid item xs={6} md={3}><Typography variant="caption" color="textSecondary">หมวดหมู่</Typography><Typography variant="body2" fontWeight="600">{categories.find(c => c.categoryId === selectedProduct.categoryId)?.categoryName || '-'}</Typography></Grid>
                                                <Grid item xs={6} md={2}><Typography variant="caption" color="textSecondary">ขนาด</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.sizeSpec || '-'}</Typography></Grid>
                                                <Grid item xs={6} md={2}><Typography variant="caption" color="textSecondary">สี</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.color || '-'}</Typography></Grid>
                                                <Grid item xs={6} md={2}><Typography variant="caption" color="textSecondary">หน่วยนับ</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.unitName}</Typography></Grid>
                                                
                                                <Grid item xs={12}><Divider sx={{ my: 1, borderStyle: 'dashed' }} /></Grid>

                                                <Grid item xs={6} md={3}><Typography variant="caption" color="textSecondary">น้ำหนัก</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.standardWeightKg ? `${selectedProduct.standardWeightKg} กก.` : '-'}</Typography></Grid>
                                                <Grid item xs={6} md={3}><Typography variant="caption" color="textSecondary">อายุการใช้งาน (วัน)</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.maxLifespanDays ? `${selectedProduct.maxLifespanDays} วัน` : '-'}</Typography></Grid>
                                                <Grid item xs={6} md={3}><Typography variant="caption" color="textSecondary">อายุการใช้งาน (รอบซัก)</Typography><Typography variant="body2" fontWeight="600">{selectedProduct.maxWashCount ? `${selectedProduct.maxWashCount} รอบ` : '-'}</Typography></Grid>
                                            </Grid>
                                        </Paper>
                                    )}
                                </Collapse>

                                <Collapse in={isNewProduct}>
                                    <Box sx={{ mt: 3, p: 3, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2, border: `1px dashed ${theme.palette.secondary.main}` }}>
                                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2, color: theme.palette.secondary.main }}>
                                            <FiberNew /> <Typography variant="subtitle2" fontWeight="bold">สร้างสินค้าใหม่ (New Master Data)</Typography>
                                        </Stack>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}><FormLabel label="ชื่อสินค้า" required><TextField fullWidth value={newProductData.productName} onChange={e => setNewProductData(prev => ({ ...prev, productName: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={12} md={6}><FormLabel label="รหัสสินค้า (SKU)" required><TextField fullWidth value={newProductData.productCode} onChange={e => setNewProductData(prev => ({ ...prev, productCode: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={12} md={6}>
                                                <FormLabel label="หมวดหมู่ (Category)" required>
                                                    <Autocomplete freeSolo options={categories.map(c => c.categoryName)} value={newProductData.categoryName} onChange={(event, newValue) => setNewProductData(prev => ({ ...prev, categoryName: newValue || '' }))} onInputChange={(event, newInputValue) => setNewProductData(prev => ({ ...prev, categoryName: newInputValue }))} renderInput={(params) => <TextField {...params} placeholder="เลือก หรือ พิมพ์ใหม่..." error={!newProductData.categoryName} disabled={!canWrite} />} disabled={!canWrite} />
                                                </FormLabel>
                                            </Grid>
                                            <Grid item xs={6} md={3}><FormLabel label="ขนาด (Size)"><TextField fullWidth value={newProductData.sizeSpec} onChange={e => setNewProductData(prev => ({ ...prev, sizeSpec: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={6} md={3}><FormLabel label="สี (Color)"><TextField fullWidth value={newProductData.color} onChange={e => setNewProductData(prev => ({ ...prev, color: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={6} md={3}><FormLabel label="น้ำหนัก (กก.)"><TextField fullWidth type="number" value={newProductData.standardWeightKg} onChange={e => setNewProductData(prev => ({ ...prev, standardWeightKg: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={6} md={3}><FormLabel label="หน่วยนับ"><TextField fullWidth value={newProductData.unitName} onChange={e => setNewProductData(prev => ({ ...prev, unitName: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            
                                            <Grid item xs={12}><Divider sx={{ my: 1, borderStyle: 'dashed' }} /></Grid>

                                            <Grid item xs={12} md={4}><FormLabel label="อายุการใช้งาน (วัน)"><TextField fullWidth type="number" value={newProductData.maxLifespanDays} onChange={e => setNewProductData(prev => ({ ...prev, maxLifespanDays: e.target.value }))} disabled={!canWrite} /></FormLabel></Grid>
                                            <Grid item xs={12} md={4}><FormLabel label="อายุการใช้งาน (รอบซัก)"><TextField fullWidth type="number" value={maxWash} onChange={e => setMaxWash(Number(e.target.value))} disabled={!canWrite || newProductData.isDisposable} /></FormLabel></Grid>
                                            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'flex-end', pb: 1 }}><FormControlLabel control={<Switch color="warning" checked={newProductData.isDisposable} onChange={e => setNewProductData(prev => ({ ...prev, isDisposable: e.target.checked }))} disabled={!canWrite} />} label={<Typography variant="body2" fontWeight="bold" color={newProductData.isDisposable ? 'warning.main' : 'textSecondary'}>เป็นผ้าชนิดใช้แล้วทิ้ง</Typography>} /></Grid>
                                        </Grid>
                                    </Box>
                                </Collapse>

                                {!isNewProduct && (
                                    <Box sx={{ mt: 3 }}>
                                        <Grid container spacing={3} alignItems="center">
                                            <Grid item xs={12} md={4}>
                                                <FormLabel label="ตั้งค่ารอบซักสูงสุดของ Lot นี้">
                                                    <TextField fullWidth type="number" value={maxWash} onChange={e => setMaxWash(Number(e.target.value))} disabled={!canWrite || selectedProduct?.isDisposable} InputProps={{ startAdornment: <InputAdornment position="start"><LocalLaundryService fontSize="small" /></InputAdornment>, endAdornment: <Typography variant="caption">รอบ</Typography> }} />
                                                </FormLabel>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>

                {/* --- Right Column: Scanning Action --- */}
                <Grid item xs={12} lg={4}>
                    <Card elevation={0} sx={{ height: '100%', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}><QrCodeScanner color="primary" /> จุดสแกน (Scanning Point)</Typography>
                            </Box>

                            <Box sx={{ p: 3, flexGrow: 1 }}>
                                <Box sx={{ mb: 3 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <FormLabel label="เครื่องอ่าน RFID (Reader)" required />
                                        {selectedReader && <ReaderWakeButton readerName={selectedReader} isOnline={isReaderOnline} />}
                                    </Stack>
                                    
                                    <Select fullWidth value={selectedReader} onChange={handleReaderChange} displayEmpty disabled={!canWrite}>
                                        <MenuItem value="" disabled>-- เลือกเครื่องอ่าน --</MenuItem>
                                        {readers.map((r) => (<MenuItem key={r.readerId} value={r.readerName}><Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">{r.readerName}{r.isActive ? <CheckCircle fontSize="small" color="success" /> : <ErrorOutline fontSize="small" color="error" />}</Stack></MenuItem>))}
                                    </Select>
                                </Box>

                                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2, border: `1px dashed ${theme.palette.secondary.main}`, mb: 3 }}>
                                    <form onSubmit={handleManualInput}>
                                        <TextField inputRef={inputRef} fullWidth variant="standard" placeholder={!selectedReader ? "กรุณาเลือกเครื่องอ่าน..." : "พร้อมสแกน RFID..."} value={rfidInput} onChange={e => setRfidInput(e.target.value)} disabled={!canWrite || !selectedReader || !selectedHospital} InputProps={{ disableUnderline: true, startAdornment: <QrCodeScanner color={selectedReader ? "primary" : "disabled"} sx={{ mr: 1 }} />, sx: { fontSize: '1.1rem', fontWeight: 500 } }} />
                                    </form>
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">รายการที่สแกนล่าสุด</Typography>
                                        <Chip label={`${scannedRfids.length}`} color={scannedRfids.length > 0 ? "primary" : "default"} size="small" />
                                    </Stack>

                                    {/* ✅ ตารางรายการที่สแกน โชว์ข้อมูลที่ผูกไว้ให้ชัดเจน */}
                                    <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, maxHeight: 350, overflowY: 'auto', bgcolor: '#fafafa' }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ bgcolor: '#f1f5f9', fontWeight: 'bold' }}>#</TableCell>
                                                    <TableCell sx={{ bgcolor: '#f1f5f9', fontWeight: 'bold' }}>RFID Tag</TableCell>
                                                    <TableCell sx={{ bgcolor: '#f1f5f9', fontWeight: 'bold' }}>ข้อมูลที่จะบันทึก</TableCell>
                                                    <TableCell sx={{ bgcolor: '#f1f5f9' }} align="right"></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {scannedRfids.length === 0 ? (
                                                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.disabled' }}><PlaylistAddCheck sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} /><Typography variant="body2">ยังไม่มีรายการ</Typography></TableCell></TableRow>
                                                ) : (
                                                    scannedRfids.map((rfid, idx) => (
                                                        <TableRow key={idx} hover sx={{ bgcolor: 'white' }}>
                                                            <TableCell width="10%" sx={{ color: 'text.secondary' }}>{scannedRfids.length - idx}</TableCell>
                                                            <TableCell width="35%"><Typography variant="body2" fontFamily="monospace" fontWeight="600" color="primary.main">{rfid}</Typography></TableCell>
                                                            <TableCell width="45%">
                                                                <Typography variant="body2" fontWeight="500" noWrap>
                                                                    {isNewProduct ? (newProductData.productName || 'ยังไม่ระบุชื่อสินค้า') : (selectedProduct?.productName || 'ยังไม่ระบุสินค้า')}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    📍 {rooms.find(r => r.roomId.toString() === selectedLocation)?.roomName || 'ยังไม่ระบุสถานที่'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right" width="10%">
                                                                <IconButton size="small" color="error" onClick={() => canWrite && setScannedRfids(prev => prev.filter(r => r !== rfid))} disabled={!canWrite}><Delete fontSize="small" /></IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Paper>

                                    {scannedRfids.length > 0 && canWrite && (
                                        <Button size="small" color="error" startIcon={<RestartAlt />} onClick={() => setScannedRfids([])} sx={{ mt: 1, width: '100%' }}>ล้างรายการทั้งหมด</Button>
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                <Button fullWidth variant="contained" size="large" onClick={handleSubmitBatch} disabled={!canWrite || scannedRfids.length === 0} startIcon={<Save />} sx={{ py: 1.5, fontSize: '1rem', borderRadius: 2 }}>บันทึกข้อมูลเข้าระบบ</Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RegisterLinen;