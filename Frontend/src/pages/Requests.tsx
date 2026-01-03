import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip,
  Stack, Divider, ToggleButton, ToggleButtonGroup, InputAdornment, Avatar, Card, CardContent
} from '@mui/material';
import { 
  CheckCircle, Cancel, Send, History, AccessTime, Autorenew, 
  Assignment, AddCircle, Category, LocalHospital, Warning, ListAlt
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Requests: React.FC = () => {
  // --- States (Logic เดิม) ---
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Data
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  // Form
  const [requestType, setRequestType] = useState('1'); 
  const [formData, setFormData] = useState({
    categoryId: '',
    productId: '',
    wardId: '',
    quantity: '',
    damageReasonId: ''
  });

  const filteredProducts = products.filter(p => 
    !formData.categoryId || p.categoryId === Number(formData.categoryId)
  );

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const currentUser = JSON.parse(userStr);
        setUser(currentUser);
        const canApprove = currentUser.roleId === 1 || currentUser.roleId === 2;
        setIsAdmin(canApprove); 
        if (currentUser.wardId) {
            setFormData(prev => ({ ...prev, wardId: currentUser.wardId }));
        }
    }
    fetchMasterData();
    fetchRequests();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [catRes, prodRes, wardRes, reasonRes] = await Promise.all([
        axiosClient.get('/Category'),
        axiosClient.get('/Product'),
        axiosClient.get('/Ward'),
        axiosClient.get('/DamageReason').catch(() => ({ data: [] }))
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setWards(wardRes.data);
      setReasons(reasonRes.data || []);
    } catch (err) { console.error("Load Master Error", err); }
  };

  const fetchRequests = async () => {
    try {
      const res = await axiosClient.get('/Request');
      setRequests(res.data.sort((a: any, b: any) => b.requestId - a.requestId));
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async () => {
    if (!user || !user.userId) return Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
    if (!formData.productId || !formData.quantity || !formData.wardId) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    
    const quantity = parseInt(formData.quantity);
    
    // ✅ Validation: เช็คว่าจำนวนต้องมากกว่า 0
    if (quantity <= 0) return Swal.fire('แจ้งเตือน', 'จำนวนการเบิกต้องมากกว่า 0', 'warning');

    const productId = parseInt(formData.productId);
    const wardId = parseInt(formData.wardId);
    const typeId = parseInt(requestType);
    let damageReasonId: number | null = null;
    if (typeId === 2 && formData.damageReasonId) damageReasonId = parseInt(formData.damageReasonId);

    const payload = {
        requestType: typeId,
        requestedByUserId: user.userId,
        targetWardId: wardId,
        currentStatusId: 1, 
        requestItems: [{ productId, quantityRequested: quantity, damageReasonId }]
    };

    try {
      await axiosClient.post('/Request', payload);
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ส่งคำร้องเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
      setFormData(prev => ({ ...prev, productId: '', quantity: '', damageReasonId: '' }));
      fetchRequests();
    } catch (err: any) {
      Swal.fire('Error', 'ไม่สามารถส่งคำร้องได้', 'error');
    }
  };

  const handleApprove = async (reqId: number, isApprove: boolean) => {
    try {
      const statusId = isApprove ? 2 : 3; 
      const confirmText = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
      const confirmColor = isApprove ? '#10b981' : '#ef4444';

      Swal.fire({
        title: `ยืนยันการ${confirmText}?`,
        icon: isApprove ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
        if (result.isConfirmed) {
          const currentReq = requests.find(r => r.requestId === reqId);
          if(currentReq) {
              const cleanPayload = {
                  requestId: reqId,
                  currentStatusId: statusId,
                  requestType: currentReq.requestType,
                  requestedByUserId: currentReq.requestedByUserId,
                  targetWardId: currentReq.targetWardId,
                  requestCode: currentReq.requestCode
              };
              try {
                  await axiosClient.put(`/Request/${reqId}`, cleanPayload);
                  Swal.fire({ icon: 'success', title: 'สำเร็จ', timer: 1500, showConfirmButton: false });
                  fetchRequests(); 
              } catch (apiErr: any) { Swal.fire('Error', 'ไม่สามารถบันทึกสถานะได้', 'error'); }
          }
        }
      });
    } catch (err) { Swal.fire('Error', 'เกิดข้อผิดพลาดในระบบ', 'error'); }
  };

  const getStatusChip = (statusId: number) => {
      switch(statusId) {
          case 1: return <Chip icon={<AccessTime />} label="รออนุมัติ" color="warning" variant="outlined" size="small" />;
          case 2: return <Chip icon={<CheckCircle />} label="อนุมัติแล้ว" color="success" size="small" variant="filled" />;
          case 3: return <Chip icon={<Cancel />} label="ถูกปฏิเสธ" color="error" size="small" variant="filled" />;
          default: return <Chip label="Unknown" size="small" />;
      }
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0284c7' }}>
            <Assignment fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                ระบบจัดการคำร้อง
            </Typography>
            <Typography variant="body2" color="textSecondary">
                สร้างคำร้องและจัดการรายการเบิก/เปลี่ยนผ้า
            </Typography>
        </Box>
      </Box>

      {/* 1. ส่วน Form (เต็มความกว้าง) */}
      <Card sx={{ mb: 4, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Send color="primary" />
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                สร้างคำร้องใหม่ (New Request)
            </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
                {/* Type Selection */}
                <Grid item xs={12} md={3}>
                    <Typography variant="caption" fontWeight="bold" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ประเภทคำร้อง</Typography>
                    <ToggleButtonGroup
                        color="primary"
                        value={requestType}
                        exclusive
                        onChange={(e, v) => v && setRequestType(v)}
                        fullWidth
                        size="small"
                    >
                        <ToggleButton value="1">เบิกผ้า</ToggleButton>
                        <ToggleButton value="2">เปลี่ยนผ้า</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>

                {/* Ward */}
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small" sx={{ mt: { md: 3 } }}>
                        <InputLabel>วอร์ด/แผนก</InputLabel>
                        <Select 
                            value={formData.wardId} 
                            label="วอร์ด/แผนก" 
                            onChange={e => setFormData({...formData, wardId: e.target.value})}
                        >
                            {wards.map((w) => <MenuItem key={w.wardId} value={w.wardId}>{w.wardName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Category */}
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small" sx={{ mt: { md: 3 } }}>
                        <InputLabel>หมวดผ้า</InputLabel>
                        <Select 
                            value={formData.categoryId} 
                            label="หมวดผ้า" 
                            onChange={e => setFormData({...formData, categoryId: e.target.value})}
                        >
                            <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                            {categories.map((c) => <MenuItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Product */}
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small" sx={{ mt: { md: 3 } }}>
                        <InputLabel>รายการผ้า</InputLabel>
                        <Select value={formData.productId} label="รายการผ้า" onChange={e => setFormData({...formData, productId: e.target.value})}>
                            {filteredProducts.map((p) => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Row 2 */}
                <Grid item xs={12} md={3}>
                    <TextField 
                        fullWidth 
                        size="small" 
                        type="number" 
                        label="จำนวน (ชิ้น)" 
                        value={formData.quantity} 
                        onChange={e => setFormData({...formData, quantity: e.target.value})} 
                        // ✅ ป้องกันการกดลูกศรลงต่ำกว่า 1
                        InputProps={{ inputProps: { min: 1 } }}
                    />
                </Grid>

                {/* Damage Reason (Show if type 2) */}
                {requestType === '2' && (
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small" error>
                            <InputLabel>สาเหตุชำรุด</InputLabel>
                            <Select 
                                value={formData.damageReasonId} 
                                label="สาเหตุชำรุด" 
                                onChange={e => setFormData({...formData, damageReasonId: e.target.value})}
                            >
                                {reasons.map((r) => <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                )}

                <Grid item xs={12} md={requestType === '2' ? 6 : 9} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="outlined" onClick={() => setFormData({...formData, quantity: '', productId: ''})}>ล้างข้อมูล</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSubmit} 
                        startIcon={requestType === '1' ? <AddCircle /> : <Autorenew />}
                        sx={{ px: 4, borderRadius: 2 }}
                    >
                        {requestType === '1' ? 'ส่งคำร้องเบิก' : 'ส่งคำร้องเปลี่ยน'}
                    </Button>
                </Grid>
            </Grid>
        </CardContent>
      </Card>

      {/* 2. ส่วน Table (เต็มความกว้าง) */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListAlt color="action" />
                <Typography variant="subtitle1" fontWeight="bold" color="textSecondary">
                    {isAdmin ? 'รายการรออนุมัติ / ประวัติทั้งหมด' : 'ประวัติคำร้องของฉัน'}
                </Typography>
            </Box>
            <Chip label={`${requests.length} รายการ`} size="small" color="default" />
        </Box>
        
        <TableContainer>
            <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>เลขที่ / วันที่</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>ผู้เบิก / แผนก</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>รายการสินค้า</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%' }}>สถานะ</TableCell>
                        {isAdmin && <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%' }}>จัดการ</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.length === 0 ? (
                        <TableRow><TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 5, color: '#94a3b8' }}>ไม่พบข้อมูลคำร้อง</TableCell></TableRow>
                    ) : requests.map((req) => (
                        <TableRow key={req.requestId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            {/* Column 1: ID & Date */}
                            <TableCell>
                                <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                    {req.requestCode}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    {new Date(req.createdAt || Date.now()).toLocaleDateString('th-TH')}
                                    <br/>
                                    {new Date(req.createdAt || Date.now()).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.
                                </Typography>
                            </TableCell>
                            
                            {/* Column 2: User & Ward */}
                            <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                    {req.targetWard?.wardName || '-'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    ผู้เบิก: {req.requestedByUser?.firstName}
                                </Typography>
                            </TableCell>

                            {/* Column 3: Items */}
                            <TableCell>
                                {req.requestItems?.map((item: any, idx: number) => (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5, borderBottom: idx !== req.requestItems.length -1 ? '1px dashed #eee' : 'none' }}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: '#e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                                            {item.quantityRequested}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2">
                                                {item.product?.productName} <span style={{color:'#94a3b8', fontSize:'0.8em'}}>({item.product?.sizeSpec})</span>
                                            </Typography>
                                            {item.damageReason && (
                                                <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Warning fontSize="inherit" /> {item.damageReason.reasonName}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </TableCell>

                            {/* Column 4: Status */}
                            <TableCell align="center">
                                {getStatusChip(req.currentStatusId)}
                            </TableCell>

                            {/* Column 5: Action (Admin) */}
                            {isAdmin && (
                                <TableCell align="center">
                                    {req.currentStatusId === 1 && (
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <IconButton 
                                                size="small" 
                                                sx={{ color: '#10b981', bgcolor: '#ecfdf5', border: '1px solid #10b981', '&:hover':{ bgcolor: '#d1fae5' } }}
                                                onClick={() => handleApprove(req.requestId, true)}
                                                title="อนุมัติ"
                                            >
                                                <CheckCircle fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                sx={{ color: '#ef4444', bgcolor: '#fef2f2', border: '1px solid #ef4444', '&:hover':{ bgcolor: '#fee2e2' } }}
                                                onClick={() => handleApprove(req.requestId, false)}
                                                title="ปฏิเสธ"
                                            >
                                                <Cancel fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Requests;