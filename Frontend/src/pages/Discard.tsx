import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, MenuItem, 
  FormControl, Select, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, Autocomplete, Card, CardContent, Divider, InputLabel, InputAdornment
} from '@mui/material';
import { 
  Search, Info, ReportProblem, Delete, RestoreFromTrash, QrCodeScanner, Description
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Discard: React.FC = () => {
  // --- States ---
  const [linens, setLinens] = useState<any[]>([]); 
  const [reasons, setReasons] = useState<any[]>([]);
  
  const [discardHistory, setDiscardHistory] = useState<any[]>([]);
  const [deleteHistory, setDeleteHistory] = useState<any[]>([]);

  // Form Data
  const [selectedLinen, setSelectedLinen] = useState<any | null>(null);
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [linenRes, reasonRes, discardRes, deleteRes] = await Promise.all([
        axiosClient.get('/Linen'), 
        axiosClient.get('/DamageReason'),
        axiosClient.get('/Linen/DiscardHistory'),
        axiosClient.get('/Linen/DeleteHistory')
      ]);
      setLinens(linenRes.data);
      setReasons(reasonRes.data);
      setDiscardHistory(discardRes.data);
      setDeleteHistory(deleteRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const refreshHistories = async () => {
    const discardRes = await axiosClient.get('/Linen/DiscardHistory');
    const deleteRes = await axiosClient.get('/Linen/DeleteHistory');
    setDiscardHistory(discardRes.data);
    setDeleteHistory(deleteRes.data);
  };

  const getCategoryName = (product: any) => {
    if (!product) return '-';
    const cat = product.category || product.Category; 
    if (!cat) return 'ไม่ระบุ';
    return cat.categoryName || cat.CategoryName || cat.category_name || 'ไม่ระบุ';
  };

  // --- Handlers ---
  const handleSubmit = async () => {
    if (!selectedLinen) return Swal.fire('เตือน', 'กรุณาเลือกรายการผ้า', 'warning');
    if (!reasonId) return Swal.fire('เตือน', 'กรุณาระบุสาเหตุ', 'warning');

    const payload = {
        rfidCode: selectedLinen.rfidCode,
        productId: selectedLinen.productId,
        damageReasonId: parseInt(reasonId),
        note: note,
        reportedByUserId: 1 
    };

    try {
      await axiosClient.post('/Linen/Discard', payload);
      Swal.fire({ icon: 'success', title: 'แจ้งชำรุดสำเร็จ', timer: 1500, showConfirmButton: false });
      
      refreshHistories();
      setSelectedLinen(null);
      setNote('');
      setReasonId('');
      
      const linenRes = await axiosClient.get('/Linen');
      setLinens(linenRes.data);
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleDeletePermanent = async () => {
    if (!selectedLinen) return Swal.fire('เตือน', 'กรุณาเลือกรายการผ้าที่จะลบ', 'warning');

    Swal.fire({
      title: 'ลบข้อมูลถาวร?',
      text: `ต้องการลบ ${selectedLinen.rfidCode} ออกจากระบบถาวรใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบถาวร',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/Linen/${selectedLinen.linenId}`);
          Swal.fire('ลบเสร็จสิ้น', 'ข้อมูลถูกลบออกจากระบบแล้ว', 'success');
          refreshHistories();
          setSelectedLinen(null);
          setNote('');
          setReasonId('');
          const linenRes = await axiosClient.get('/Linen');
          setLinens(linenRes.data);
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
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fee2e2', color: '#dc2626' }}>
            <ReportProblem fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                แจ้งผ้าชำรุด / ลบออกจากระบบ
            </Typography>
            <Typography variant="body2" color="textSecondary">
                บันทึกประวัติความเสียหายหรือจำหน่ายผ้าออกจากสต็อก
            </Typography>
        </Box>
      </Box>

      {/* --- ส่วนบน: FORM --- */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
         <Grid container spacing={3}>
            
            {/* ROW 1: Search (Full Width) */}
            <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#334155' }}>
                    1. ค้นหาผ้า (ระบุ RFID หรือ ชื่อสินค้า)
                </Typography>
                <Autocomplete
                    fullWidth
                    options={linens}
                    getOptionLabel={(option) => `${option.rfidCode} : ${option.product?.productName} (${option.product?.sizeSpec})`}
                    value={selectedLinen}
                    onChange={(event, newValue) => setSelectedLinen(newValue)}
                    renderInput={(params) => (
                        <TextField 
                            {...params} 
                            placeholder="สแกน RFID หรือพิมพ์ค้นหา..." 
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <>
                                        <QrCodeScanner color="action" sx={{ mr: 1 }} />
                                        {params.InputProps.startAdornment}
                                    </>
                                )
                            }}
                        />
                    )}
                />
            </Grid>

            {/* ROW 2: Info Card (Full Width) */}
            <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: selectedLinen ? '#f0f9ff' : '#f8fafc', borderColor: selectedLinen ? '#bae6fd' : '#e2e8f0', transition: 'all 0.3s' }}>
                    <CardContent sx={{ py: 3, '&:last-child': { pb: 3 } }}>
                        {!selectedLinen ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 1 }}>
                                <Info /> <Typography variant="body1">ข้อมูลสินค้าจะแสดงที่นี่อัตโนมัติ (Auto-Fill)</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid #e2e8f0' } }}>
                                    <Typography variant="caption" color="textSecondary" display="block">RFID Code</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="#0284c7" sx={{ fontFamily: 'monospace' }}>
                                        {selectedLinen.rfidCode}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid #e2e8f0' }, pl: { md: 3 } }}>
                                    <Typography variant="caption" color="textSecondary" display="block">สินค้า</Typography>
                                    <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                                        {selectedLinen.product?.productName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ pl: { md: 3 } }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Chip label={getCategoryName(selectedLinen.product)} size="small" color="primary" variant="filled" />
                                        <Typography variant="body2">Size: <b>{selectedLinen.product?.sizeSpec}</b></Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        )}
                    </CardContent>
                </Card>
            </Grid>

            {/* ROW 3: Reason & Note */}
            <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#334155' }}>
                    2. ระบุสาเหตุความเสียหาย
                </Typography>
                <FormControl fullWidth>
                    <Select 
                        value={reasonId} 
                        onChange={(e) => setReasonId(e.target.value)} 
                        displayEmpty
                        renderValue={(selected) => {
                            if (!selected) return <Typography color="#94a3b8">เลือกสาเหตุ...</Typography>;
                            const r = reasons.find(x => x.reasonId === parseInt(selected as string));
                            return r ? r.reasonName : selected;
                        }}
                    >
                        {reasons.map((r) => (
                            <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#334155' }}>
                    3. หมายเหตุ (Optional)
                </Typography>
                <TextField
                    fullWidth
                    placeholder="รายละเอียดเพิ่มเติม..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    InputProps={{
                        startAdornment: <Description color="action" sx={{ mr: 1, opacity: 0.7 }} fontSize="small" />
                    }}
                />
            </Grid>

            {/* ROW 4: Action Buttons */}
            <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={handleDeletePermanent}
                        color="error"
                        startIcon={<Delete />}
                        disabled={!selectedLinen}
                        sx={{ px: 3, borderRadius: 2 }}
                    >
                        ลบถาวร (Delete)
                    </Button>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        color="warning"
                        startIcon={<ReportProblem />}
                        disabled={!selectedLinen}
                        sx={{ px: 4, borderRadius: 2, boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}
                    >
                        บันทึกแจ้งชำรุด (Discard)
                    </Button>
                </Box>
            </Grid>

         </Grid>
      </Paper>

      {/* --- ส่วนล่าง: HISTORY --- */}
      <Grid container spacing={3}>
        {/* Left: Discard History */}
        <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <Box sx={{ p: 2, bgcolor: '#fff7ed', borderBottom: '1px solid #ffedd5', display: 'flex', alignItems: 'center' }}>
                    <ReportProblem color="warning" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="#c2410c">ประวัติแจ้งชำรุดล่าสุด</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>รายการ</TableCell>
                                <TableCell align="right">สาเหตุ/เวลา</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {discardHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3, color: '#94a3b8' }}>ไม่มีข้อมูล</TableCell></TableRow>
                            ) : discardHistory.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">{row.item}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={row.reason} size="small" color="warning" variant="outlined" sx={{ mb: 0.5 }} />
                                        <Typography variant="caption" display="block" color="textSecondary">{row.time}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Grid>

        {/* Right: Delete History */}
        <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center' }}>
                    <RestoreFromTrash color="error" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="#b91c1c">ประวัติการลบถาวร</Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>รายการที่ถูกลบ</TableCell>
                                <TableCell align="right">เวลา</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deleteHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3, color: '#94a3b8' }}>ไม่มีข้อมูล</TableCell></TableRow>
                            ) : deleteHistory.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold" color="error">{row.item}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="caption" color="textSecondary">{row.time}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Grid>

      </Grid>

    </Box>
  );
};

export default Discard;