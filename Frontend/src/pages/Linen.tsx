import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Stack,
  InputAdornment, Card, CardContent, Divider, Tooltip
} from '@mui/material';
import { 
  AddCircle, QrCodeScanner, Delete, Inventory, Search, CheckCircle, Cancel
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Linen: React.FC = () => {
  // --- States ---
  const [linens, setLinens] = useState<any[]>([]);
  const [filteredLinens, setFilteredLinens] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master Data (Dropdowns)
  const [products, setProducts] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    rfidCode: '',
    productId: '',
    hospitalId: '',
    vendorId: ''
  });

  useEffect(() => {
    fetchMasterData();
    fetchLinens();
  }, []);

  // Search Logic
  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = linens.filter(item => 
        item.rfidCode?.toLowerCase().includes(lowerTerm) || 
        item.product?.productName?.toLowerCase().includes(lowerTerm)
    );
    setFilteredLinens(filtered);
  }, [searchTerm, linens]);

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
      
      // Set Default Hospital ถ้ามีข้อมูล
      if (hospRes.data.length > 0) {
          setFormData(prev => ({...prev, hospitalId: hospRes.data[0].hospitalId}));
      }
    } catch (err) { console.error("Error loading master data", err); }
  };

  const fetchLinens = async () => {
    try {
      const res = await axiosClient.get('/Linen');
      setLinens(res.data);
      setFilteredLinens(res.data);
    } catch (err) { console.error(err); }
  };

  // --- Actions ---

  const handleGenRFID = () => {
      // จำลองการอ่าน RFID หรือ Gen เลขมั่วๆ เพื่อ Test
      const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(24, '0');
      setFormData({ ...formData, rfidCode: 'E200' + randomHex.substring(4) });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.rfidCode || !formData.productId || !formData.hospitalId) {
      return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน (RFID, สินค้า, โรงพยาบาล)', 'warning');
    }

    const payload = {
        rfidCode: formData.rfidCode,
        productId: parseInt(formData.productId),
        hospitalId: parseInt(formData.hospitalId),
        vendorId: formData.vendorId ? parseInt(formData.vendorId) : null,
        isActive: true
    };

    try {
      await axiosClient.post('/Linen', payload);
      
      Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: `เพิ่ม RFID: ${formData.rfidCode} เข้าระบบแล้ว`,
          timer: 1500,
          showConfirmButton: false
      });
      
      // Reset Form (เก็บ Hospital ไว้ เพราะน่าจะแอดรัวๆ ที่เดิม)
      setFormData(prev => ({ ...prev, rfidCode: '', productId: '' })); 
      fetchLinens(); // Refresh Table
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleDelete = async (id: number, rfid: string) => {
      Swal.fire({
          title: 'ลบข้อมูล?',
          text: `ต้องการลบ RFID: ${rfid} ออกจากระบบหรือไม่?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'ลบข้อมูล'
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  await axiosClient.delete(`/Linen/${id}`);
                  Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
                  fetchLinens();
              } catch (err) {
                  Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
              }
          }
      });
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
            <Inventory fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                จัดการสต็อกผ้า (Linen Inventory)
            </Typography>
            <Typography variant="body2" color="textSecondary">
                ลงทะเบียนผ้าใหม่ ตรวจสอบสถานะ และจัดการข้อมูล RFID
            </Typography>
        </Box>
      </Box>

      {/* Form Section */}
      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory color="primary" />
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                ลงทะเบียนผ้าใหม่ (Register Linen)
            </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
           <Grid container spacing={3}>
               {/* 1. ข้อมูลหลัก */}
               <Grid item xs={12}>
                   <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ข้อมูลสินค้า (Product Info)</Typography>
                   <Divider sx={{ mb: 2 }} />
               </Grid>

               <Grid item xs={12} md={6}>
                 <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField 
                        fullWidth 
                        size="small"
                        label="RFID Code (สแกน หรือ กรอก)" 
                        value={formData.rfidCode} 
                        onChange={e => setFormData({...formData, rfidCode: e.target.value})} 
                        placeholder="E200..."
                        autoFocus
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><QrCodeScanner fontSize="small" color="action"/></InputAdornment>
                        }}
                    />
                    <Button variant="outlined" onClick={handleGenRFID} sx={{ minWidth: 80 }}>
                        สุ่ม
                    </Button>
                 </Box>
               </Grid>

               <Grid item xs={12} md={6}>
                 <FormControl fullWidth size="small">
                    <InputLabel>ชนิดผ้า / สินค้า</InputLabel>
                    <Select 
                        value={formData.productId} 
                        label="ชนิดผ้า / สินค้า" 
                        onChange={e => setFormData({...formData, productId: e.target.value})}
                    >
                        {products.map((p) => (
                            <MenuItem key={p.productId} value={p.productId}>
                                {p.productName} ({p.sizeSpec || 'มาตรฐาน'})
                            </MenuItem>
                        ))}
                    </Select>
                 </FormControl>
               </Grid>

               {/* 2. ข้อมูลเจ้าของ */}
               <Grid item xs={12} sx={{ mt: 1 }}>
                   <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ความเป็นเจ้าของ (Ownership)</Typography>
                   <Divider sx={{ mb: 2 }} />
               </Grid>

               <Grid item xs={12} md={6}>
                 <FormControl fullWidth size="small">
                    <InputLabel>โรงพยาบาลเจ้าของ</InputLabel>
                    <Select 
                        value={formData.hospitalId} 
                        label="โรงพยาบาลเจ้าของ" 
                        onChange={e => setFormData({...formData, hospitalId: e.target.value})}
                    >
                        {hospitals.map((h) => <MenuItem key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</MenuItem>)}
                    </Select>
                 </FormControl>
               </Grid>

               <Grid item xs={12} md={6}>
                 <FormControl fullWidth size="small">
                    <InputLabel>บริษัทผู้ผลิต/จำหน่าย</InputLabel>
                    <Select 
                        value={formData.vendorId} 
                        label="บริษัทผู้ผลิต/จำหน่าย" 
                        onChange={e => setFormData({...formData, vendorId: e.target.value})}
                    >
                        <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                        {vendors.map((v) => <MenuItem key={v.vendorId} value={v.vendorId}>{v.vendorName}</MenuItem>)}
                    </Select>
                 </FormControl>
               </Grid>

               <Grid item xs={12} sx={{ textAlign: 'right', mt: 2 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    onClick={handleSubmit} 
                    startIcon={<AddCircle />}
                    sx={{ px: 4, borderRadius: 2 }}
                  >
                      บันทึกเข้าระบบ
                  </Button>
               </Grid>
           </Grid>
        </CardContent>
      </Card>

      {/* List Table Section */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory color="primary"/> รายการผ้าในระบบ <Chip label={filteredLinens.length} size="small" color="primary" sx={{ ml: 1, borderRadius: 1 }} />
            </Typography>
            
            <TextField
                size="small"
                placeholder="ค้นหา (RFID, ชื่อสินค้า)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
            />
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>RFID Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Owner (Hospital)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>Registered Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: '#64748b' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: '#64748b' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLinens.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94a3b8' }}>ไม่พบข้อมูล</TableCell></TableRow>
              ) : filteredLinens.map((item) => (
                <TableRow key={item.linenId} hover>
                  <TableCell>
                      <Chip 
                        label={item.rfidCode} 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        sx={{ fontFamily: 'monospace', fontWeight: 500, bgcolor: '#eff6ff', border: 'none' }} 
                      />
                  </TableCell>
                  <TableCell>
                      <Typography variant="body2" fontWeight="bold">{item.product?.productName || '-'}</Typography>
                      <Typography variant="caption" color="textSecondary">{item.product?.sizeSpec}</Typography>
                  </TableCell>
                  <TableCell>{item.hospital?.hospitalName || '-'}</TableCell>
                  <TableCell>{new Date(item.registeredAt).toLocaleString('th-TH')}</TableCell>
                  <TableCell align="center">
                      {item.isActive ? (
                          <Chip icon={<CheckCircle />} label="Active" size="small" color="success" variant="outlined" />
                      ) : (
                          <Chip icon={<Cancel />} label="Inactive" size="small" color="default" variant="outlined" />
                      )}
                  </TableCell>
                  <TableCell align="center">
                      <Tooltip title="ลบข้อมูล">
                          <IconButton color="error" size="small" onClick={() => handleDelete(item.linenId, item.rfidCode)} sx={{ bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}>
                              <Delete fontSize="small" />
                          </IconButton>
                      </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Linen;