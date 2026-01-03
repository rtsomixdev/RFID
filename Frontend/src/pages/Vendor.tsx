import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton 
} from '@mui/material';
import { Delete, Add, Business } from '@mui/icons-material';
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
    // ✅ 1. เพิ่ม Validation Check: ห้ามชื่อบริษัทเป็นค่าว่าง
    if (!formData.vendorName.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอก "ชื่อบริษัท / ร้านค้า" ก่อนบันทึก',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#f59e0b'
        });
        return; // 🛑 หยุดทำงานทันที ไม่ส่งข้อมูลไป Server
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
    // ✅ 2. เพิ่ม Logic ยืนยันการลบ
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
            <Business fontSize="large" />
        </Paper>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            จัดการข้อมูลบริษัทคู่ค้า
        </Typography>
      </Box>

      {/* Form Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} md={5}>
            <TextField 
                fullWidth 
                label="ชื่อบริษัท / ร้านค้า *" 
                placeholder="ระบุชื่อบริษัท..."
                value={formData.vendorName} 
                onChange={e => setFormData({...formData, vendorName: e.target.value})} 
                size="medium"
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField 
                fullWidth 
                label="เลขทะเบียนการค้า / ข้อมูลติดต่อ" 
                placeholder="ระบุเลขทะเบียนหรือเบอร์โทร..."
                value={formData.registrationNumber} 
                onChange={e => setFormData({...formData, registrationNumber: e.target.value})} 
                size="medium"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button 
                fullWidth 
                variant="contained" 
                startIcon={<Add />} 
                onClick={handleSubmit} 
                sx={{ height: 56, borderRadius: 2, bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}
            >
                เพิ่ม
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Section */}
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>ชื่อบริษัท</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>เลขทะเบียน / ติดต่อ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#475569' }}>จัดการ</TableCell>
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
                      <TableCell align="right">
                        <IconButton 
                            onClick={() => handleDelete(v.vendorId)} 
                            size="small"
                            sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Vendor;