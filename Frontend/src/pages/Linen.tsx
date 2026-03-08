import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Card, CardContent, Select, MenuItem,
  Stack, InputAdornment, Autocomplete, createFilterOptions, Collapse, Alert, Chip, Paper,
  useTheme, alpha, Divider, Grid, Switch, FormControlLabel, TablePagination
} from '@mui/material';
import {
  AppRegistration, Delete, PlaylistAddCheck, QrCodeScanner, RestartAlt,
  LocalLaundryService, Info, Save,
  Category, FiberNew,
  CheckCircle, ErrorOutline, Room,
  DeleteForever
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';
import ReaderWakeButton from '../components/ReaderWakeButton';

const filter = createFilterOptions<any>();

/**
 * โครงสร้างข้อมูลสินค้าหรือผลิตภัณฑ์
 * @interface Product
 */
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

/**
 * โครงสร้างข้อมูลเครื่องอ่าน RFID
 * @interface Reader
 */
interface Reader {
  readerId: number;
  readerName: string;
  isActive: boolean;
  location?: string;
}

/**
 * หน้าจอลงทะเบียนผ้าใหม่เข้าสู่ระบบ
 * * @returns {JSX.Element} คอมโพเนนต์ลงทะเบียนผ้าใหม่
 */
const RegisterLinen: React.FC = () => {
  const theme = useTheme();

  // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลของระบบอย่างละเอียด
  const userStr = localStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const permissions = currentUser?.permissions || currentUser?.Permissions || [];
  const roleId = currentUser?.roleId || currentUser?.RoleId || 0;

  // ตรวจสอบสิทธิ์ ผู้ดูแลระบบ (1) จะมีสิทธิทั้งหมด หรือต้องมีสิทธิ WRITE_LINEN ถึงจะสามารถดำเนินการได้
  const canWrite = roleId === 1 || permissions.includes('WRITE_LINEN');

  // ข้อมูลหลักของระบบ (Master Data)
  const [products, setProducts] = useState<Product[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);

  // สถานะสำหรับการดึงข้อมูลที่ผู้ใช้งานเลือก (Selection State)
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedReader, setSelectedReader] = useState<string>('');
  const [isReaderOnline, setIsReaderOnline] = useState(false);

  const [maxWash, setMaxWash] = useState<number>(100);

  // สถานะสำหรับเก็บข้อมูลสินค้าแบบผสม (Product Hybrid State)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  const [newProductData, setNewProductData] = useState({
    productName: '', productCode: '', categoryName: '', sizeSpec: '', unitName: 'ชิ้น',
    standardWeightKg: '', maxLifespanDays: '', color: '', isDisposable: false
  });

  const [rfidInput, setRfidInput] = useState('');
  const [scannedRfids, setScannedRfids] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // ขั้นตอนการกำหนดค่าเริ่มต้นและการโหลดข้อมูล (Initialization)
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

  // ตัวดักจับและจัดการเหตุการณ์การสแกนแบบเรียลไทม์
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

  // ส่วนของการเรียกใช้งาน API (API Calls)
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

    const hospData = await fetchData('/Hospital', setHospitals);
    if (hospData.length > 0 && !selectedHospital) setSelectedHospital(hospData[0].hospitalId);

    const readerData = await fetchData('/Reader', setReaders);
    if (readerData.length > 0 && !selectedReader) {
      const active = readerData.find((r: Reader) => r.isActive);
      if (active) {
        setSelectedReader(active.readerName);
      }
    }
  };

  const fetchReadersOnly = async () => {
    try {
      const res = await axiosClient.get('/Reader');
      setReaders(res.data || []);
    } catch (err) { console.error(err); }
  };

  // ส่วนของการจัดการเหตุการณ์จากผู้ใช้งาน (Event Handlers)
  const handleReaderChange = (event: any) => {
    setSelectedReader(event.target.value);
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

  // ฟังก์ชันจัดการลบข้อมูลสินค้าออกจากระบบ
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    Swal.fire({
      title: 'ยืนยันการลบสินค้า?',
      html: `คุณกำลังจะลบ <b>${selectedProduct.productName}</b> ออกจากระบบ<br/><span style="color:red; font-size: 0.9em;">(คำเตือน: หากมีผ้าที่ผูกกับสินค้านี้อยู่ อาจส่งผลกระทบต่อข้อมูลสต็อก)</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: theme.palette.error.main,
      cancelButtonColor: '#ccc',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/Product/${selectedProduct.productId}`);
          Swal.fire('ลบสำเร็จ!', 'ลบสินค้าออกจากระบบแล้ว', 'success');
          setSelectedProduct(null); // ล้างข้อมูลช่องเลือก
          fetchMasterData(); // โหลดข้อมูลรายการสินค้าใหม่จากระบบ
        } catch (err: any) {
          Swal.fire('เกิดข้อผิดพลาด', err.response?.data?.message || 'ไม่สามารถลบสินค้านี้ได้', 'error');
        }
      }
    });
  };

  // ส่วนการจัดการบันทึกข้อมูลแบบกลุ่ม (Submit Logic)
  const handleSubmitBatch = async () => {
    if (!canWrite) return Swal.fire('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์ลงทะเบียนผ้าเข้าระบบ', 'error');
    if (!selectedHospital) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุ โรงพยาบาล', 'warning');
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
            defaultRoomId: 1
          });
          finalProductId = prodRes.data.productId;
        }
      }

      const finalLocationName = 'คลังผ้าสะอาด';

      await axiosClient.post('/Linen/RegisterBatch', {
        productId: finalProductId,
        hospitalId: parseInt(selectedHospital),
        // ✅ แก้ไข: เพิ่มการส่ง vendorId ไปด้วย
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

      <Grid container spacing={3} alignItems="stretch">
        {/* คอลัมน์ซ้าย: ข้อมูลประกอบของการลงทะเบียน */}
        <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
          <Stack spacing={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

            {/* กล่องแสดงข้อมูล: ข้อมูลล็อตและสถานที่จัดเก็บ */}
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
                      <TextField
                        fullWidth
                        disabled
                        value="คลังผ้าสะอาด"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Room color="success" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiInputBase-root.Mui-disabled': {
                            bgcolor: alpha(theme.palette.success.main, 0.05),
                            color: theme.palette.success.dark,
                            fontWeight: 'bold',
                            WebkitTextFillColor: theme.palette.success.dark
                          }
                        }}
                      />
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

            {/* กล่องแสดงข้อมูล: ข้อมูลสินค้า */}
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'visible', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="700" color="primary.main" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category /> ข้อมูลสินค้า (Product Info)
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormLabel label="ค้นหาหรือสร้างสินค้าใหม่" required>
                        {/* กำหนดความกว้างกล่องให้เติมเต็มพื้นที่ (100%) */}
                        <Box sx={{ width: '100%', minWidth: { xs: '100%', sm: '400px', lg: '600px' } }}>
                          <Autocomplete
                            fullWidth
                            size="small"
                            disabled={!canWrite}
                            value={isNewProduct ? newProductData.productName : selectedProduct}
                            onChange={handleProductChange}
                            onInputChange={(_, newInputValue) => { if (isNewProduct) setNewProductData(prev => ({ ...prev, productName: newInputValue })); }}
                            filterOptions={(options, params) => {
                              const filtered = filter(options, params);
                              const { inputValue } = params;
                              const isExisting = options.some((option) => inputValue === option.productName);
                              if (inputValue !== '' && !isExisting) {
                                filtered.push({ inputValue, productName: `เพิ่มสินค้าใหม่: "${inputValue}"` });
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
                                <Box sx={{ width: '100%' }}>
                                  <Typography variant="body2" fontWeight="bold">{option.productName}</Typography>
                                  {option.productCode && <Typography variant="caption" color="text.secondary">Code: {option.productCode}</Typography>}
                                </Box>
                              </li>
                            )}
                            freeSolo
                            renderInput={(params) => <TextField {...params} fullWidth placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..." />}
                          />
                        </Box>
                      </FormLabel>
                    </Grid>
                  </Grid>

                  <Collapse in={!isNewProduct && selectedProduct !== null} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mt: 3 }}>
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      {selectedProduct && (
                        <Paper elevation={0} sx={{
                          p: { xs: 2, md: 4 },
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          flexGrow: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                            <Typography variant="h6" fontWeight="bold" color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
                              {selectedProduct.productName}
                              {selectedProduct.isDisposable && <Chip label="ใช้แล้วทิ้ง" color="warning" size="small" sx={{ ml: 2, fontWeight: 'bold' }} />}
                            </Typography>

                            {canWrite && (
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<DeleteForever />}
                                onClick={handleDeleteProduct}
                                sx={{ textTransform: 'none' }}
                              >
                                ลบสินค้านี้
                              </Button>
                            )}
                          </Stack>

                          <Grid container spacing={4}>
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>รหัสสินค้า</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.productCode || '-'}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2.4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>หมวดหมู่</Typography>
                              <Typography variant="body1" fontWeight="600" noWrap>{categories.find(c => c.categoryId === selectedProduct.categoryId)?.categoryName || '-'}</Typography>
                            </Grid>
                            <Grid item xs={4} sm={4} md={2.4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>ขนาด</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.sizeSpec || '-'}</Typography>
                            </Grid>
                            <Grid item xs={4} sm={6} md={2.4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>สี</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.color || '-'}</Typography>
                            </Grid>
                            <Grid item xs={4} sm={6} md={2.4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>หน่วยนับ</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.unitName}</Typography>
                            </Grid>

                            <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                            <Grid item xs={6} sm={4} md={4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>น้ำหนัก</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.standardWeightKg ? `${selectedProduct.standardWeightKg} กก.` : '-'}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4} md={4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>อายุการใช้งาน (วัน)</Typography>
                              <Typography variant="body1" fontWeight="600">{selectedProduct.maxLifespanDays ? `${selectedProduct.maxLifespanDays} วัน` : '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4} md={4}>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>อายุการใช้งาน (รอบซัก)</Typography>
                              <Typography variant="body1" fontWeight="600" color="info.main">{selectedProduct.maxWashCount ? `${selectedProduct.maxWashCount} รอบ` : '-'}</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      )}
                    </Box>
                  </Collapse>

                  <Collapse in={isNewProduct} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mt: 3, p: 4, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2, border: `1px dashed ${theme.palette.secondary.main}`, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3, color: theme.palette.secondary.main }}>
                        <FiberNew fontSize="large" /> <Typography variant="h6" fontWeight="bold">สร้างสินค้าใหม่ (New Master Data)</Typography>
                      </Stack>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <FormLabel label="ชื่อสินค้า" required>
                            <TextField fullWidth value={newProductData.productName} onChange={e => setNewProductData(prev => ({ ...prev, productName: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormLabel label="รหัสสินค้า (SKU)" required>
                            <TextField fullWidth value={newProductData.productCode} onChange={e => setNewProductData(prev => ({ ...prev, productCode: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormLabel label="หมวดหมู่ (Category)" required>
                            <Autocomplete freeSolo options={categories.map(c => c.categoryName)} value={newProductData.categoryName} onChange={(event, newValue) => setNewProductData(prev => ({ ...prev, categoryName: newValue || '' }))} onInputChange={(event, newInputValue) => setNewProductData(prev => ({ ...prev, categoryName: newInputValue }))} renderInput={(params) => <TextField {...params} placeholder="เลือก หรือ พิมพ์ใหม่..." error={!newProductData.categoryName} disabled={!canWrite} />} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <FormLabel label="ขนาด (Size)">
                            <TextField fullWidth value={newProductData.sizeSpec} onChange={e => setNewProductData(prev => ({ ...prev, sizeSpec: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <FormLabel label="สี (Color)">
                            <TextField fullWidth value={newProductData.color} onChange={e => setNewProductData(prev => ({ ...prev, color: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>

                        <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

                        <Grid item xs={6} md={3}>
                          <FormLabel label="น้ำหนัก (กก.)">
                            <TextField fullWidth type="number" value={newProductData.standardWeightKg} onChange={e => setNewProductData(prev => ({ ...prev, standardWeightKg: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <FormLabel label="หน่วยนับ">
                            <TextField fullWidth value={newProductData.unitName} onChange={e => setNewProductData(prev => ({ ...prev, unitName: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormLabel label="อายุการใช้งาน (วัน)">
                            <TextField fullWidth type="number" value={newProductData.maxLifespanDays} onChange={e => setNewProductData(prev => ({ ...prev, maxLifespanDays: e.target.value }))} disabled={!canWrite} />
                          </FormLabel>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormLabel label="อายุการใช้งาน (รอบซัก)">
                            <TextField fullWidth type="number" value={maxWash} onChange={e => setMaxWash(Number(e.target.value))} disabled={!canWrite || newProductData.isDisposable} />
                          </FormLabel>
                        </Grid>

                        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'flex-end', pb: 1 }}>
                          <FormControlLabel
                            control={<Switch color="warning" checked={newProductData.isDisposable} onChange={e => setNewProductData(prev => ({ ...prev, isDisposable: e.target.checked }))} disabled={!canWrite} />}
                            label={<Typography variant="body1" fontWeight="bold" color={newProductData.isDisposable ? 'warning.main' : 'textSecondary'}>เป็นผ้าชนิดใช้แล้วทิ้ง (Disposable)</Typography>}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </Box>

                {!isNewProduct && (
                  <Box sx={{ mt: 'auto', pt: 4 }}>
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <FormLabel label="ตั้งค่ารอบซักสูงสุดของ Lot นี้ (สามารถปรับแก้ได้)">
                          <TextField fullWidth type="number" value={maxWash} onChange={e => setMaxWash(Number(e.target.value))} disabled={!canWrite || selectedProduct?.isDisposable} InputProps={{ startAdornment: <InputAdornment position="start"><LocalLaundryService color="primary" /></InputAdornment>, endAdornment: <Typography variant="body2" fontWeight="bold" color="text.secondary">รอบ</Typography>, sx: { fontSize: '1.1rem' } }} />
                        </FormLabel>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* คอลัมน์ขวา: ระบบสแกนและเพิ่มรายการอัตโนมัติ */}
        <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
          <Card elevation={0} sx={{ width: '100%', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}><QrCodeScanner color="primary" /> จุดสแกน (Scanning Point)</Typography>
              </Box>

              <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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

                <Box sx={{ mb: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">รายการที่สแกนล่าสุด</Typography>
                    <Chip label={`${scannedRfids.length}`} color={scannedRfids.length > 0 ? "primary" : "default"} size="small" />
                  </Stack>

                  <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, flexGrow: 1, bgcolor: '#fafafa' }}>
                    <Table size="small">
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
                          scannedRfids.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((rfid, idx) => (
                            <TableRow key={idx} hover sx={{ bgcolor: 'white' }}>
                              <TableCell width="10%" sx={{ color: 'text.secondary' }}>{scannedRfids.length - idx}</TableCell>
                              <TableCell width="35%"><Typography variant="body2" fontFamily="monospace" fontWeight="600" color="primary.main">{rfid}</Typography></TableCell>
                              <TableCell width="45%">
                                <Typography variant="body2" fontWeight="500" noWrap>
                                  {isNewProduct ? (newProductData.productName || 'ยังไม่ระบุชื่อสินค้า') : (selectedProduct?.productName || 'ยังไม่ระบุสินค้า')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Room fontSize="inherit" color="success" /> คลังผ้าสะอาด
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
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={scannedRfids.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />

                  {scannedRfids.length > 0 && canWrite && (
                    <Button size="small" color="error" startIcon={<RestartAlt />} onClick={() => setScannedRfids([])} sx={{ mt: 2, width: '100%' }}>ล้างรายการทั้งหมด</Button>
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