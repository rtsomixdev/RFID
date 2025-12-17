import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton 
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Vendor: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({ vendorName: '', registrationNumber: '' });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try {
      const res = await axiosClient.get('/Vendor');
      setVendors(res.data);
    } catch(err) { console.error(err); }
  };

  const handleSubmit = async () => {
    try {
      await axiosClient.post('/Vendor', formData);
      Swal.fire('สำเร็จ', 'เพิ่มบริษัทเรียบร้อย', 'success');
      setFormData({ vendorName: '', registrationNumber: '' });
      fetchVendors();
    } catch(err) { Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error'); }
  };

  const handleDelete = async (id: number) => {
    // (ใส่ Logic Delete เหมือน Hospital)
    await axiosClient.delete(`/Vendor/${id}`);
    fetchVendors();
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>จัดการข้อมูลบริษัทคู่ค้า</Typography>
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} md={5}>
            <TextField fullWidth label="ชื่อบริษัท / ร้านค้า" value={formData.vendorName} onChange={e=>setFormData({...formData, vendorName: e.target.value})} />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField fullWidth label="เลขทะเบียนการค้า" value={formData.registrationNumber} onChange={e=>setFormData({...formData, registrationNumber: e.target.value})} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<Add />} onClick={handleSubmit} sx={{ height: 56, borderRadius: 2 }}>เพิ่ม</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell>ชื่อบริษัท</TableCell>
                <TableCell>เลขทะเบียน</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.vendorId}>
                  <TableCell>{v.vendorName}</TableCell>
                  <TableCell>{v.registrationNumber || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleDelete(v.vendorId)} color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Vendor;