import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem,
  Stack, Divider, InputAdornment, Autocomplete, createFilterOptions, Collapse, Tooltip, Alert, Chip, Paper
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AppRegistration, Delete, PlaylistAddCheck, QrCodeScanner, RestartAlt,
  LocalLaundryService, Info, Save,
  Category, FiberNew, SettingsRemote,
  CheckCircle, ErrorOutline, AddCircleOutline, Room
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const filter = createFilterOptions<any>();

// --- Interfaces for Type Safety ---
interface Product {
  productId: number;
  productName: string;
  productCode: string;
  categoryId: number;
  sizeSpec?: string;
  unitName: string;
  maxWashCount?: number;
  [key: string]: any;
}

interface Reader {
  readerId: number;
  readerName: string;
  isActive: boolean;
  installedAtRoomId?: number; // ✅ เพิ่ม Field นี้สำหรับ Auto Location
  installedAtRoom?: { roomId: number; roomName: string; };
}

const RegisterLinen: React.FC = () => {
  // --- Master Data ---
  const [products, setProducts] = useState<Product[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);

  // --- Selection State ---
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedReader, setSelectedReader] = useState<string>('');
  const [maxWash, setMaxWash] = useState<number>(100);

  // --- Product Hybrid State ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

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

  // --- Initialization ---
  useEffect(() => {
    fetchMasterData();
  }, []);

  // ✅ Real-time Scan Listener
  useEffect(() => {
    const handleAutoScan = (e: any) => {
      const incomingData = e.detail;
      const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;
      const readerName = typeof incomingData === 'object' ? incomingData.reader : null;

      // 1. Validate Selections
      if (!selectedReader) {
        toastWarning('กรุณาเลือกเครื่องอ่านก่อนเริ่มสแกน');
        return;
      }
      if (!selectedHospital) {
        toastWarning('กรุณาเลือกโรงพยาบาลก่อน');
        return;
      }

      // 2. Filter Reader
      if (readerName && selectedReader !== readerName) {
        return; // Ignore other readers
      }

      // 3. Add to list
      if (rfid) {
        addRfidToList(rfid);
      }
    };

    window.addEventListener("RFID_SCANNED", handleAutoScan);
    return () => {
      window.removeEventListener("RFID_SCANNED", handleAutoScan);
    };
  }, [selectedReader, selectedHospital, scannedRfids]);

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
      // Add to top
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
    await fetchData('/Room', setRooms);
    await fetchData('/Category', setCategories);

    const hospData = await fetchData('/Hospital', setHospitals);
    if (hospData.length > 0 && !selectedHospital) setSelectedHospital(hospData[0].hospitalId);

    const readerData = await fetchData('/Reader', setReaders);
    
    // ✅ Logic ใหม่: Auto-select Reader และ Location ของมัน
    if (readerData.length > 0 && !selectedReader) {
      const active = readerData.find((r: Reader) => r.isActive);
      if (active) {
        setSelectedReader(active.readerName);
        // ถ้าเครื่องอ่านนี้ผูกกับห้องไว้ ให้เลือกห้องนั้นเลย
        if (active.installedAtRoomId) {
          setSelectedLocation(active.installedAtRoomId.toString());
        }
      }
    }
  };

  // --- Event Handlers ---
  
  // ✅ Handle Reader Change + Auto Location
  const handleReaderChange = (event: any) => {
    const readerName = event.target.value;
    setSelectedReader(readerName);

    // ค้นหาข้อมูลเครื่องอ่านที่เลือก
    const targetReader = readers.find(r => r.readerName === readerName);
    
    // ถ้าเครื่องอ่านมีห้องที่ติดตั้งอยู่ (InstalledAtRoomId) ให้ Auto Select Location
    if (targetReader && targetReader.installedAtRoomId) {
      const roomIdStr = targetReader.installedAtRoomId.toString();
      setSelectedLocation(roomIdStr);
      
      // Optional: แจ้งเตือนเล็กน้อยให้ User รู้ว่าเปลี่ยน Location แล้ว
      const roomName = rooms.find(r => r.roomId === targetReader.installedAtRoomId)?.roomName;
      const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'info', title: `ปรับสถานที่ตามเครื่องอ่าน: ${roomName}` });
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
    if (!selectedReader || !selectedHospital) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือก Reader และ โรงพยาบาลก่อน', 'warning');
      return;
    }
    addRfidToList(rfidInput);
    setRfidInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // --- Submit Logic ---
  const handleSubmitBatch = async () => {
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

      // 1. Create Product if New
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
            standardWeightKg: 0.5, 
            maxLifespanDays: 365,
            defaultRoomId: selectedLocation ? parseInt(selectedLocation) : 1
          });
          finalProductId = prodRes.data.productId;
        }
      }

      // 2. Register Batch
      const locationObj = rooms.find(r => r.roomId === parseInt(selectedLocation));
      
      await axiosClient.post('/Linen/RegisterBatch', {
        productId: finalProductId,
        hospitalId: parseInt(selectedHospital),
        vendorId: selectedVendor ? parseInt(selectedVendor) : null,
        maxWashCount: Number(maxWash),
        currentLocation: locationObj ? locationObj.roomName : 'Stock',
        rfidCodes: scannedRfids
      });

      // 3. Success & Reset
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ!',
        text: `ลงทะเบียนผ้า ${scannedRfids.length} รายการ เรียบร้อย`,
        timer: 2000
      });

      setScannedRfids([]);
      setRfidInput('');
      setIsNewProduct(false);
      setSelectedProduct(null);
      setNewProductData({ productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น' });
      
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
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#F4F6F8', minHeight: '100vh' }}>
      {/* --- Header --- */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          p: 2, borderRadius: 3,
          background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
          color: 'white',
          boxShadow: '0 8px 16px rgba(33, 150, 243, 0.3)'
        }}>
          <AppRegistration fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
            ลงทะเบียนผ้าใหม่ (New Linen Registration)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            จัดการข้อมูลสินค้าและบันทึกรหัส RFID ลงในระบบ
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* --- Left Column: Configuration Forms --- */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* 1. Context Info */}
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'visible' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="700" color="primary.main" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info /> ข้อมูลล็อตและสถานที่
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>โรงพยาบาลเจ้าของ *</InputLabel>
                      <Select
                        value={selectedHospital}
                        label="โรงพยาบาลเจ้าของ *"
                        onChange={e => setSelectedHospital(e.target.value)}
                      >
                        {hospitals.map(h => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>สถานที่จัดเก็บเริ่มต้น *</InputLabel>
                      <Select
                        value={selectedLocation}
                        label="สถานที่จัดเก็บเริ่มต้น *"
                        onChange={e => setSelectedLocation(e.target.value)}
                      >
                        {rooms.map(r => <MenuItem key={r.roomId} value={r.roomId}>
                          {r.roomName} 
                          {/* Optional: แสดงว่าห้องนี้ผูกกับ Reader ไหนถ้าต้องการ */}
                        </MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
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
              </CardContent>
            </Card>

            {/* 2. Product Info (Hybrid Selection) */}
            <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'visible' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight="700" color="primary.main" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category /> ข้อมูลสินค้า (Product)
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Autocomplete
                      fullWidth size="small"
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
                      selectOnFocus clearOnBlur handleHomeEndKeys
                      options={products}
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
                      renderInput={(params) => (
                        <TextField {...params} label="ค้นหา หรือ พิมพ์ชื่อเพื่อเพิ่มสินค้าใหม่" placeholder="พิมพ์ชื่อสินค้า..." />
                      )}
                    />
                  </Grid>
                </Grid>

                {/* --- Existing Product Detail (กรอบเทา) --- */}
                <Collapse in={!isNewProduct && selectedProduct !== null}>
                    {selectedProduct && (
                        <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', border: '1px solid #EEF2F6', borderRadius: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="textSecondary">รหัสสินค้า (Code)</Typography>
                                    <Typography variant="body2" fontWeight="600">{selectedProduct.productCode}</Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="textSecondary">หมวดหมู่ (Category)</Typography>
                                    {/* ดึงชื่อหมวดหมู่มาโชว์โดยเทียบ ID */}
                                    <Typography variant="body2" fontWeight="600">
                                        {categories.find(c => c.categoryId === selectedProduct.categoryId)?.categoryName || '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <Typography variant="caption" color="textSecondary">หน่วยนับ</Typography>
                                    <Typography variant="body2" fontWeight="600">{selectedProduct.unitName}</Typography>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <Typography variant="caption" color="textSecondary">ขนาด</Typography>
                                    <Typography variant="body2" fontWeight="600">{selectedProduct.sizeSpec || '-'}</Typography>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <Typography variant="caption" color="textSecondary">อายุการใช้งาน</Typography>
                                    <Typography variant="body2" fontWeight="600">{selectedProduct.maxWashCount || 100} รอบ</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    )}
                </Collapse>

                {/* --- New Product Form --- */}
                <Collapse in={isNewProduct}>
                  <Box sx={{ mt: 3, p: 3, bgcolor: '#FFF0F5', borderRadius: 2, border: '1px dashed #EC407A' }}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2, color: '#C2185B' }}>
                      <FiberNew /> <Typography variant="subtitle2" fontWeight="bold">สร้างสินค้าใหม่ (New Master Data)</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField size="small" fullWidth label="ชื่อสินค้า" value={newProductData.productName} onChange={e => setNewProductData(prev => ({ ...prev, productName: e.target.value }))} required />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField size="small" fullWidth label="รหัสสินค้า (SKU)" value={newProductData.productCode} onChange={e => setNewProductData(prev => ({ ...prev, productCode: e.target.value }))} required />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                            size="small"
                            freeSolo // อนุญาตให้พิมพ์เองได้
                            options={categories.map(c => c.categoryName)} // ตัวเลือกที่มีอยู่
                            value={newProductData.categoryName}
                            
                            // 1. ทำงานเมื่อ "เลือก" จาก Dropdown
                            onChange={(event, newValue: string | null) => {
                                setNewProductData(prev => ({ ...prev, categoryName: newValue || '' }));
                            }}
                            
                            // 2. 🔥 สำคัญมาก: ทำงานเมื่อ "พิมพ์" เอง (แก้บั๊กค่าว่าง)
                            onInputChange={(event, newInputValue) => {
                                setNewProductData(prev => ({ ...prev, categoryName: newInputValue }));
                            }}
                            
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    label="หมวดหมู่ (Category)" 
                                    placeholder="เลือก หรือ พิมพ์ใหม่..." 
                                    required // เพิ่มดาวแดงบังคับ
                                    error={!newProductData.categoryName && isNewProduct} // แดงถ้าเป็นสินค้าใหม่แล้วไม่กรอก
                                />
                            )}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="ขนาด (Size Spec)" value={newProductData.sizeSpec} onChange={e => setNewProductData(prev => ({ ...prev, sizeSpec: e.target.value }))} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="หน่วยนับ" value={newProductData.unitName} onChange={e => setNewProductData(prev => ({ ...prev, unitName: e.target.value }))} />
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>

                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth size="small"
                        label="อายุการใช้งาน (รอบซัก)"
                        type="number"
                        value={maxWash}
                        onChange={e => setMaxWash(Number(e.target.value))}
                        InputProps={{ startAdornment: <InputAdornment position="start"><LocalLaundryService fontSize="small" /></InputAdornment>, endAdornment: <Typography variant="caption">รอบ</Typography> }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* --- Right Column: Scanning Action --- */}
        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ height: '100%', borderRadius: 4, border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

              {/* Reader Select */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsRemote color={selectedReader ? 'primary' : 'disabled'} /> เครื่องอ่าน RFID
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedReader}
                    onChange={handleReaderChange} // ✅ ใช้ Handle ใหม่ที่เพิ่ม Logic Auto Location
                    displayEmpty
                    sx={{ bgcolor: selectedReader ? '#E3F2FD' : 'white' }}
                  >
                    <MenuItem value="" disabled>-- เลือกเครื่องอ่าน --</MenuItem>
                    {readers.map((r) => (
                      <MenuItem key={r.readerId} value={r.readerName}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                          {r.readerName}
                          {r.isActive ? <CheckCircle fontSize="small" color="success" /> : <ErrorOutline fontSize="small" color="error" />}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* แสดงชื่อห้องที่เครื่องอ่านนี้ติดตั้งอยู่ (ถ้ามี) */}
                {selectedReader && (() => {
                  const r = readers.find(x => x.readerName === selectedReader);
                  if(r?.installedAtRoom?.roomName) {
                    return <Typography variant="caption" color="text.secondary" sx={{ml:1, mt:0.5, display:'block'}}>📍 ติดตั้งที่: {r.installedAtRoom.roomName}</Typography>
                  }
                })()}
              </Box>

              {/* Scan Input */}
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px dashed #CBD5E1', mb: 2 }}>
                <form onSubmit={handleManualInput}>
                  <TextField
                    inputRef={inputRef}
                    fullWidth
                    variant="outlined"
                    placeholder={!selectedReader ? "เลือกเครื่องอ่านก่อน..." : "พร้อมสแกน RFID..."}
                    value={rfidInput}
                    onChange={e => setRfidInput(e.target.value)}
                    disabled={!selectedReader || !selectedHospital}
                    InputProps={{
                      startAdornment: <QrCodeScanner color="primary" sx={{ mr: 1, opacity: 0.7 }} />,
                      sx: { bgcolor: 'white' }
                    }}
                  />
                </form>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button size="small" color="error" startIcon={<RestartAlt />} onClick={() => setScannedRfids([])} disabled={scannedRfids.length === 0}>
                    ล้างรายการ
                  </Button>
                </Box>
              </Box>

              {/* Scanned List */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">รายการที่สแกน</Typography>
                  <Chip label={`${scannedRfids.length} รายการ`} color="primary" size="small" />
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ flexGrow: 1, border: '1px solid #E0E0E0', borderRadius: 2, maxHeight: '400px', bgcolor: 'white' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#F1F5F9', fontWeight: 'bold' }}>#</TableCell>
                        <TableCell sx={{ bgcolor: '#F1F5F9', fontWeight: 'bold' }}>RFID Tag</TableCell>
                        <TableCell sx={{ bgcolor: '#F1F5F9', fontWeight: 'bold' }} align="right"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scannedRfids.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                            <PlaylistAddCheck sx={{ fontSize: 48, color: '#E0E0E0', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">รอการสแกน...</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        scannedRfids.map((rfid, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell width="10%">{scannedRfids.length - idx}</TableCell>
                            <TableCell width="70%">
                              <Typography variant="body2" fontFamily="monospace" fontWeight="500" color="primary.main">{rfid}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => setScannedRfids(prev => prev.filter(r => r !== rfid))}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Submit Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmitBatch}
                disabled={scannedRfids.length === 0}
                startIcon={<Save />}
                sx={{
                  mt: 3, py: 1.5, fontSize: '1.1rem',
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  textTransform: 'none'
                }}
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