import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Card, InputAdornment, Stack, Chip, Tooltip
} from '@mui/material';
import {
  Delete, AddCircle, Business, Badge, Edit, Storefront, ListAlt, Save, Cancel
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';
import { sendNotification } from '../utils/notificationUtil';

// ⚠️ URL ของ Backend (Port 5134)
const API_URL = 'http://localhost:5134/api/Vendor';

const Vendor: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({ vendorName: '', registrationNumber: '' });
  
  // ✅ 1. เพิ่ม State สำหรับเก็บ ID ที่กำลังแก้ไข
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(API_URL);
      setVendors(res.data);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  // ✅ 2. ฟังก์ชันเมื่อกดปุ่มดินสอ (Edit)
  const handleEdit = (vendor: any) => {
    setEditId(vendor.vendorId); // จำ ID ที่จะแก้
    setFormData({
      vendorName: vendor.vendorName,
      registrationNumber: vendor.registrationNumber || ''
    }); // ดึงข้อมูลเก่ามาใส่ฟอร์ม
    
    // เลื่อนหน้าจอขึ้นไปที่ฟอร์ม
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ 3. ฟังก์ชันยกเลิกการแก้ไข
  const handleCancel = () => {
    setEditId(null);
    setFormData({ vendorName: '', registrationNumber: '' });
  };

  const handleSubmit = async () => {
    if (!formData.vendorName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอก "ชื่อบริษัท / ร้านค้า" ก่อนบันทึก',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    try {
      if (editId) {
        // 🟡 กรณีแก้ไข (PUT)
        await axios.put(`${API_URL}/${editId}`, {
          vendorId: editId, // ส่ง ID กลับไปยืนยัน
          ...formData
        });

        Swal.fire('แก้ไขสำเร็จ', 'ข้อมูลถูกอัปเดตแล้ว', 'success');
        handleCancel(); // เคลียร์ฟอร์มกลับเป็นโหมดปกติ
      } else {
        // 🟢 กรณีเพิ่มใหม่ (POST)
        await axios.post(API_URL, formData);

        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'เพิ่มบริษัทเรียบร้อย',
          timer: 1500,
          showConfirmButton: false
        });

        await sendNotification(
          "เพิ่มบริษัทคู่ค้าใหม่",
          `บริษัท ${formData.vendorName} ถูกเพิ่มเข้าสู่ระบบแล้ว`,
          "INFO",
          "/vendors",
          undefined,
          1
        );

        setFormData({ vendorName: '', registrationNumber: '' });
      }

      fetchVendors(); // โหลดข้อมูลใหม่
    } catch (err) {
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
          const vendorName = vendors.find(v => v.vendorId === id)?.vendorName || 'ไม่ระบุชื่อ';
          
          await axios.delete(`${API_URL}/${id}`);

          Swal.fire('ลบสำเร็จ', 'ข้อมูลถูกลบแล้ว', 'success');

          await sendNotification(
            "ลบบริษัทคู่ค้า",
            `ข้อมูลของบริษัท ${vendorName} ถูกลบออกจากระบบ`,
            "WARNING",
            "/vendors",
            undefined,
            1
          );

          fetchVendors();
        } catch (err: any) {
          console.error("Delete Error:", err);
          const serverMessage = err.response?.data?.message || 'ไม่สามารถลบข้อมูลได้ (อาจมีข้อมูลผูกพัน)';
          
          Swal.fire({
            icon: 'error',
            title: 'ลบไม่ได้!',
            text: serverMessage,
            confirmButtonColor: '#d33'
          });
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
      <Card elevation={2} sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

        {/* Form Section */}
        {/* เปลี่ยนสีพื้นหลังเล็กน้อยเมื่ออยู่ในโหมดแก้ไข จะได้รู้ตัว */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: editId ? '#fffbeb' : 'inherit' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: editId ? '#d97706' : '#334155' }}>
            {editId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />} 
            {editId ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มบริษัทคู่ค้าใหม่'}
          </Typography>
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                label="ชื่อบริษัท / ร้านค้า *"
                placeholder="ตัวอย่าง: บริษัท ซักอบรีด จำกัด"
                value={formData.vendorName}
                onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
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
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
              {editId ? (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<Save />}
                    onClick={handleSubmit}
                    sx={{ height: 40, borderRadius: 2 }}
                  >
                    บันทึก
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    sx={{ height: 40, borderRadius: 2 }}
                  >
                    ยกเลิก
                  </Button>
                </>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddCircle />}
                  onClick={handleSubmit}
                  sx={{ height: 40, borderRadius: 2 }}
                >
                  เพิ่มข้อมูล
                </Button>
              )}
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
                    <TableRow key={v.vendorId} hover selected={editId === v.vendorId}>
                      <TableCell sx={{ fontWeight: 500, color: '#1e293b', maxWidth: 200 }}>
                        <Tooltip title={v.vendorName}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {v.vendorName}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', maxWidth: 200 }}>
                        <Tooltip title={v.registrationNumber || '-'}>
                          <Typography variant="body2" noWrap>
                            {v.registrationNumber || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          {/* ✅ ปุ่มแก้ไข ใส่ onClick แล้ว */}
                          <IconButton 
                            size="small" 
                            onClick={() => handleEdit(v)}
                            sx={{ color: '#3b82f6', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}
                          >
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