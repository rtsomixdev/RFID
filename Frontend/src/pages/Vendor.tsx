import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Card, CardContent, InputAdornment, Stack, Chip
} from '@mui/material';
import { 
  Delete, AddCircle, Business, Edit, Storefront, Badge, Phone, ListAlt
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Vendor: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({ vendorName: '', registrationNumber: '' });

  useEffect(() => { 
    fetchVendors(); 
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axiosClient.get('/Vendor');
      setVendors(res.data);
    } catch(err) { 
      console.error(err); 
    }
  };

  const handleSubmit = async () => {
    if (!formData.vendorName.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอก "ชื่อบริษัท / ร้านค้า" ก่อนบันทึก',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#f59e0b'
        });
        return; 
    }

    try {
      await axiosClient.post('/Vendor', formData);
      
      Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'เพิ่มบริษัทเรียบร้อย',
          timer: 1500,
          showConfirmButton: false
      });
      
      setFormData({ vendorName: '', registrationNumber: '' });
      fetchVendors();
    } catch(err) { 
      console.error(err);
      Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error'); 
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "ข้อมูลจะถูกลบออกจากระบบถาวร",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.delete(`/Vendor/${id}`);
                Swal.fire('ลบสำเร็จ', 'ข้อมูลถูกลบแล้ว', 'success');
                fetchVendors();
            } catch (err) {
                Swal.fire('Error', 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        }
    });
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
            <Storefront fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                จัดการข้อมูลบริษัทคู่ค้า
            </Typography>
            <Typography variant="body2" color="textSecondary">
                บริหารจัดการรายชื่อ Supplier และข้อมูลการติดต่อ
            </Typography>
        </Box>
      </Box>

      {/* Content Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        
        {/* Form Section */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
                <AddCircle color="primary" fontSize="small" /> เพิ่มบริษัทคู่ค้าใหม่
            </Typography>
            <Grid container spacing={3} alignItems="flex-start">
              <Grid item xs={12} md={5}>
                <TextField 
                    fullWidth 
                    size="small"
                    label="ชื่อบริษัท / ร้านค้า *" 
                    placeholder="ตัวอย่าง: บริษัท ซักอบรีด จำกัด"
                    value={formData.vendorName} 
                    onChange={e => setFormData({...formData, vendorName: e.target.value})} 
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Business fontSize="small" color="action" /></InputAdornment>,
                    }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField 
                    fullWidth 
                    size="small"
                    label="เลขทะเบียน / เบอร์โทร" 
                    placeholder="ระบุข้อมูลติดต่อ..."
                    value={formData.registrationNumber} 
                    onChange={e => setFormData({...formData, registrationNumber: e.target.value})} 
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment>,
                    }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<AddCircle />} 
                    onClick={handleSubmit} 
                    sx={{ height: 40, borderRadius: 2 }}
                >
                    เพิ่มข้อมูล
                </Button>
              </Grid>
            </Grid>
        </Box>

        {/* Table Section */}
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListAlt fontSize="small" /> รายชื่อบริษัททั้งหมด
                </Typography>
                <Chip label={`${vendors.length} รายการ`} size="small" color="primary" variant="outlined" />
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>ชื่อบริษัท</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>เลขทะเบียน / ติดต่อ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#475569', width: 120 }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                            ไม่พบข้อมูล
                        </TableCell>
                     </TableRow>
                  ) : (
                      vendors.map((v) => (
                        <TableRow key={v.vendorId} hover>
                          <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>
                            {v.vendorName}
                          </TableCell>
                          <TableCell sx={{ color: '#64748b' }}>
                            {v.registrationNumber || '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                                <IconButton size="small" sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}>
                                    <Edit fontSize="small" />
                                </IconButton>
                                <IconButton 
                                    onClick={() => handleDelete(v.vendorId)} 
                                    size="small"
                                    sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
        </Box>
      </Card>
    </Box>
  );
};

export default Vendor;