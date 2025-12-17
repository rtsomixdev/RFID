import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, Stack
} from '@mui/material';
import { 
  AddCircle, QrCodeScanner, Delete, Inventory 
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Linen: React.FC = () => {
  // --- States ---
  const [linens, setLinens] = useState<any[]>([]);
  
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
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>
        ลงทะเบียนผ้าใหม่ (Register Linen)
      </Typography>

      {/* Form Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory /> เพิ่มข้อมูลผ้า
        </Typography>

        <Grid container spacing={3}>
           {/* RFID Input */}
           <Grid item xs={12} md={6}>
             <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField 
                    fullWidth 
                    label="RFID Code (สแกน หรือ กรอก)" 
                    value={formData.rfidCode} 
                    onChange={e => setFormData({...formData, rfidCode: e.target.value})} 
                    placeholder="E200..."
                    autoFocus
                />
                <Button variant="outlined" onClick={handleGenRFID} startIcon={<QrCodeScanner />}>
                    สุ่ม
                </Button>
             </Box>
           </Grid>

           {/* Product Select */}
           <Grid item xs={12} md={6}>
             <FormControl fullWidth>
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

           {/* Hospital Select */}
           <Grid item xs={12} md={6}>
             <FormControl fullWidth>
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

           {/* Vendor Select */}
           <Grid item xs={12} md={6}>
             <FormControl fullWidth>
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
      </Paper>

      {/* List Table Section */}
      <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="h6" fontWeight="bold" color="#475569">
                รายการผ้าในระบบ ({linens.length})
            </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell>RFID Code</TableCell>
                <TableCell>สินค้า</TableCell>
                <TableCell>โรงพยาบาล</TableCell>
                <TableCell>วันที่ลงทะเบียน</TableCell>
                <TableCell align="center">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {linens.map((item) => (
                <TableRow key={item.linenId} hover>
                  <TableCell>
                      <Chip label={item.rfidCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>{item.product?.productName || '-'}</TableCell>
                  <TableCell>{item.hospital?.hospitalName || '-'}</TableCell>
                  <TableCell>{new Date(item.registeredAt).toLocaleString('th-TH')}</TableCell>
                  <TableCell align="center">
                      <IconButton color="error" size="small" onClick={() => handleDelete(item.linenId, item.rfidCode)}>
                          <Delete />
                      </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {linens.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>ไม่มีข้อมูลผ้าในระบบ</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Linen;