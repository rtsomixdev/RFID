import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  InputAdornment, Stack, Tooltip, useTheme, alpha
} from '@mui/material';
import {
  Delete, AddCircle, Business, Badge, Edit, Storefront, ListAlt, Save
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axios from 'axios';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

const API_URL = 'http://localhost:5134/api/Vendor';

const Vendor: React.FC = () => {
  const theme = useTheme();

  // ✅ การเช็คสิทธิ์แบบละเอียด
  const userStr = localStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const permissions = currentUser?.permissions || currentUser?.Permissions || [];
  const roleId = currentUser?.roleId || currentUser?.RoleId || 0;
  
  // เช็คว่ามีสิทธิ์เขียน(เพิ่ม), แก้ไข, ลบ หรือไม่
  const canWrite = roleId === 1 || permissions.includes('WRITE_VENDOR');
  const canEdit = roleId === 1 || permissions.includes('EDIT_VENDOR');
  const canDelete = roleId === 1 || permissions.includes('DELETE_VENDOR');

  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({ vendorName: '', registrationNumber: '' });
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

  const handleEdit = (vendor: any) => {
    setEditId(vendor.vendorId);
    setFormData({
      vendorName: vendor.vendorName,
      registrationNumber: vendor.registrationNumber || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditId(null);
    setFormData({ vendorName: '', registrationNumber: '' });
  };

  const handleSubmit = async () => {
    if (!formData.vendorName.trim()) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอก "ชื่อบริษัท / ร้านค้า" ก่อนบันทึก' });
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, { vendorId: editId, ...formData });
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', showConfirmButton: false, timer: 1500 });
        handleCancel();
      } else {
        await axios.post(API_URL, formData);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', showConfirmButton: false, timer: 1500 });
        await sendNotification("เพิ่มบริษัทคู่ค้าใหม่", `บริษัท ${formData.vendorName} ถูกเพิ่มเข้าสู่ระบบแล้ว`, "INFO", "/vendors", undefined, 1);
        setFormData({ vendorName: '', registrationNumber: '' });
      }
      fetchVendors();
    } catch (err) {
      Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?', text: "ข้อมูลจะถูกลบออกจากระบบถาวร", icon: 'warning', showCancelButton: true, confirmButtonColor: theme.palette.error.main, confirmButtonText: 'ลบข้อมูล'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const vendorName = vendors.find(v => v.vendorId === id)?.vendorName || 'ไม่ระบุชื่อ';
          await axios.delete(`${API_URL}/${id}`);
          Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500 });
          await sendNotification("ลบบริษัทคู่ค้า", `ข้อมูลของบริษัท ${vendorName} ถูกลบออกจากระบบ`, "WARNING", "/vendors", undefined, 1);
          fetchVendors();
        } catch (err: any) {
          Swal.fire({ icon: 'error', title: 'ลบไม่ได้', text: err.response?.data?.message || 'ไม่สามารถลบข้อมูลได้' });
        }
      }
    });
  };

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="จัดการข้อมูลบริษัทคู่ค้า"
        subtitle="บริหารจัดการรายชื่อ Supplier และข้อมูลการติดต่อ"
        icon={<Storefront fontSize="large" />}
        breadcrumbs={[{ label: 'หน้าหลัก', href: '/' }, { label: 'จัดการข้อมูล' }, { label: 'บริษัทคู่ค้า' }]}
      />

      <Box>
        {/* ✅ ซ่อนฟอร์มสร้าง/แก้ไข ถ้าไม่มีสิทธิ์ */}
        {(canWrite || (editId && canEdit)) && (
            <Paper variant="outlined" sx={{ p: 4, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: editId ? alpha(theme.palette.warning.light, 0.05) : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: editId ? theme.palette.warning.dark : theme.palette.primary.dark }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: editId ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: editId ? theme.palette.warning.main : theme.palette.primary.main }}>
                {editId ? <Edit fontSize="small" /> : <AddCircle fontSize="small" />}
                </Box>
                {editId ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มบริษัทคู่ค้าใหม่'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                <FormLabel label="ชื่อบริษัท / ร้านค้า" required>
                    <TextField placeholder="ตัวอย่าง: บริษัท ซักอบรีด จำกัด" value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Business fontSize="small" color="action" /></InputAdornment> }} fullWidth />
                </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <FormLabel label="เลขทะเบียน / เบอร์โทร">
                    <TextField placeholder="ระบุข้อมูลติดต่อ..." value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" color="action" /></InputAdornment> }} fullWidth />
                </FormLabel>
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' }, display: 'flex', gap: 1, pt: 3.2 }}>
                {editId ? (
                    <>
                    <Button fullWidth variant="contained" color="warning" startIcon={<Save />} onClick={handleSubmit}>บันทึก</Button>
                    <Button fullWidth variant="outlined" color="inherit" onClick={handleCancel}>ยกเลิก</Button>
                    </>
                ) : (
                    <Button fullWidth variant="contained" startIcon={<AddCircle />} onClick={handleSubmit}>เพิ่มข้อมูล</Button>
                )}
                </Box>
            </Box>
            </Paper>
        )}

        {/* Table Section */}
        <Box sx={{ p: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ListAlt fontSize="medium" color="disabled" /> รายชื่อบริษัททั้งหมด ({vendors.length})
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อบริษัท</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>เลขทะเบียน / ติดต่อ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, width: 120 }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.disabled' }}>ไม่พบข้อมูล</TableCell></TableRow>
                ) : vendors.map((v) => (
                  <TableRow key={v.vendorId} hover selected={editId === v.vendorId}>
                    <TableCell>
                      <Tooltip title={v.vendorName}>
                        <Typography variant="body2" fontWeight={600} noWrap>{v.vendorName}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap>{v.registrationNumber || '-'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {canEdit && <IconButton size="small" onClick={() => handleEdit(v)} sx={{ color: theme.palette.primary.main }}><Edit fontSize="small" /></IconButton>}
                        {canDelete && <IconButton size="small" onClick={() => handleDelete(v.vendorId)} sx={{ color: theme.palette.error.main }}><Delete fontSize="small" /></IconButton>}
                        {!canEdit && !canDelete && <Typography variant="caption" color="text.disabled">-</Typography>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default Vendor;