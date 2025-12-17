import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip,
  Radio, RadioGroup, FormControlLabel, FormLabel, Stack
} from '@mui/material';
import { 
  CheckCircle, Cancel, Send, CleaningServices, 
  History, AccessTime, Autorenew 
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';

const Requests: React.FC = () => {
  // --- States ---
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
        setIsAdmin(currentUser.roleId === 1); // เช็คสิทธิ์ Admin
        
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

  // --- Actions ---

  const handleSubmit = async () => {
    if (!user || !user.userId) {
        return Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่', 'error');
    }
    if (!formData.productId || !formData.quantity || !formData.wardId) {
      return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    }
    
    const quantity = parseInt(formData.quantity);
    const productId = parseInt(formData.productId);
    const wardId = parseInt(formData.wardId);
    const typeId = parseInt(requestType);
    
    let damageReasonId: number | null = null;
    if (typeId === 2 && formData.damageReasonId) {
        damageReasonId = parseInt(formData.damageReasonId);
    }

    const payload = {
        requestType: typeId,
        requestedByUserId: user.userId,
        targetWardId: wardId,
        currentStatusId: 1, // Pending
        requestItems: [
          {
            productId: productId,
            quantityRequested: quantity,
            damageReasonId: damageReasonId
          }
        ]
    };

    try {
      await axiosClient.post('/Request', payload);
      Swal.fire('สำเร็จ', 'ส่งคำร้องเรียบร้อยแล้ว', 'success');
      setFormData(prev => ({ ...prev, productId: '', quantity: '', damageReasonId: '' }));
      fetchRequests();
    } catch (err: any) {
      console.error("API Error:", err);
      Swal.fire('Error', 'ไม่สามารถส่งคำร้องได้', 'error');
    }
  };

  // ✅✅✅ ฟังก์ชันที่แก้ไขใหม่: ส่ง Payload สะอาดๆ ไปอัปเดตสถานะ
  const handleApprove = async (reqId: number, isApprove: boolean) => {
    try {
      const statusId = isApprove ? 2 : 3; 
      const confirmText = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
      const confirmColor = isApprove ? '#10b981' : '#ef4444';

      Swal.fire({
        title: `ยืนยันการ${confirmText}?`,
        text: `คุณต้องการเปลี่ยนสถานะเป็น "${confirmText}" ใช่หรือไม่?`,
        icon: isApprove ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
        if (result.isConfirmed) {
          const currentReq = requests.find(r => r.requestId === reqId);
          if(currentReq) {
              // สร้าง Object ใหม่ ส่งไปเฉพาะข้อมูลที่จำเป็น
              // Backend จะได้รับข้อมูลที่ถูกต้อง ไม่ติด Error เรื่อง Object ซ้อน
              const cleanPayload = {
                  requestId: reqId,
                  currentStatusId: statusId,
                  // ข้อมูลประกอบที่จำเป็นต้องมี (ตาม Model ของ Backend)
                  requestType: currentReq.requestType,
                  requestedByUserId: currentReq.requestedByUserId,
                  targetWardId: currentReq.targetWardId,
                  requestCode: currentReq.requestCode
              };

              console.log("Approve Payload:", cleanPayload);

              try {
                  await axiosClient.put(`/Request/${reqId}`, cleanPayload);
                  
                  await Swal.fire({
                      icon: 'success',
                      title: 'สำเร็จ',
                      text: `ดำเนินการ${confirmText}เรียบร้อยแล้ว`,
                      timer: 1500,
                      showConfirmButton: false
                  });
                  
                  fetchRequests(); // โหลดข้อมูลใหม่
              } catch (apiErr: any) {
                  console.error("Approve Error:", apiErr);
                  Swal.fire('Error', 'ไม่สามารถบันทึกสถานะได้', 'error');
              }
          }
        }
      });
    } catch (err) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในระบบ', 'error');
    }
  };

  const getStatusChip = (statusId: number) => {
    switch(statusId) {
      case 1: return <Chip icon={<AccessTime />} label="รออนุมัติ" color="warning" variant="outlined" />;
      case 2: return <Chip icon={<CheckCircle />} label="อนุมัติแล้ว" color="success" />;
      case 3: return <Chip icon={<Cancel />} label="ถูกปฏิเสธ" color="error" />;
      default: return <Chip label="Unknown" />;
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>
        ระบบจัดการคำร้องเบิก/เปลี่ยนผ้า
      </Typography>

      {/* Form Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send /> ส่งคำร้องใหม่
        </Typography>

        <FormControl sx={{ mb: 3 }}>
          <FormLabel>ประเภทคำร้อง</FormLabel>
          <RadioGroup row value={requestType} onChange={(e) => setRequestType(e.target.value)}>
            <FormControlLabel value="1" control={<Radio />} label="เบิกผ้า (Request)" />
            <FormControlLabel value="2" control={<Radio />} label="เปลี่ยนผ้า (Exchange)" />
          </RadioGroup>
        </FormControl>

        <Grid container spacing={3}>
           <Grid item xs={12} md={4}>
             <FormControl fullWidth>
                <InputLabel>หมวดผ้า</InputLabel>
                <Select value={formData.categoryId} label="หมวดผ้า" onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                    {categories.map((c) => <MenuItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</MenuItem>)}
                </Select>
             </FormControl>
           </Grid>
           <Grid item xs={12} md={4}>
             <FormControl fullWidth>
                <InputLabel>รายการผ้า</InputLabel>
                <Select value={formData.productId} label="รายการผ้า" onChange={e => setFormData({...formData, productId: e.target.value})}>
                    {filteredProducts.map((p) => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                </Select>
             </FormControl>
           </Grid>
           <Grid item xs={12} md={4}>
             <FormControl fullWidth>
                <InputLabel>วอร์ด/แผนก</InputLabel>
                <Select value={formData.wardId} label="วอร์ด/แผนก" onChange={e => setFormData({...formData, wardId: e.target.value})}>
                    {wards.map((w) => <MenuItem key={w.wardId} value={w.wardId}>{w.wardName}</MenuItem>)}
                </Select>
             </FormControl>
           </Grid>

           <Grid item xs={12} md={4}>
             <TextField fullWidth type="number" label="จำนวน" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
           </Grid>
           
           {requestType === '2' && (
               <Grid item xs={12} md={4}>
                 <FormControl fullWidth>
                    <InputLabel>สาเหตุชำรุด</InputLabel>
                    <Select value={formData.damageReasonId} label="สาเหตุชำรุด" onChange={e => setFormData({...formData, damageReasonId: e.target.value})}>
                        {reasons.map((r) => <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>)}
                    </Select>
                 </FormControl>
               </Grid>
           )}

           <Grid item xs={12} sx={{ textAlign: 'right' }}>
              <Button variant="outlined" sx={{ mr: 2 }} onClick={() => setFormData({...formData, quantity: '', productId: ''})}>ล้างข้อมูล</Button>
              <Button variant="contained" onClick={handleSubmit} startIcon={requestType === '1' ? <Send /> : <Autorenew />}>
                  {requestType === '1' ? 'ส่งคำร้องเบิก' : 'ส่งคำร้องเปลี่ยน'}
              </Button>
           </Grid>
        </Grid>
      </Paper>

      {/* Table Section */}
      <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="h6" fontWeight="bold" color="#475569">
                <History sx={{ verticalAlign: 'middle', mr: 1 }} /> 
                {isAdmin ? 'รายการคำร้องทั้งหมด (Admin Mode)' : 'ประวัติคำร้องของฉัน'}
            </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell>เลขที่คำร้อง</TableCell>
                <TableCell>ประเภท</TableCell>
                <TableCell>แผนก</TableCell>
                <TableCell>วันที่</TableCell>
                <TableCell>สถานะ</TableCell>
                {isAdmin && <TableCell align="center">จัดการ</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.requestId}>
                  <TableCell>{req.requestCode || '-'}</TableCell>
                  <TableCell>{req.requestType === 1 ? 'เบิกผ้า' : 'เปลี่ยนผ้า'}</TableCell>
                  <TableCell>{wards.find(w => w.wardId === req.targetWardId)?.wardName || '-'}</TableCell>
                  <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleString('th-TH') : '-'}</TableCell>
                  <TableCell>{getStatusChip(req.currentStatusId)}</TableCell>
                  
                  {/* ปุ่มจัดการสำหรับ Admin */}
                  {isAdmin && (
                      <TableCell align="center">
                          {req.currentStatusId === 1 && (
                              <Stack direction="row" spacing={1} justifyContent="center">
                                  <IconButton 
                                    sx={{ color: '#10b981', bgcolor: '#ecfdf5', '&:hover': { bgcolor: '#d1fae5' } }} 
                                    onClick={() => handleApprove(req.requestId, true)}
                                  >
                                      <CheckCircle />
                                  </IconButton>
                                  <IconButton 
                                    sx={{ color: '#ef4444', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }} 
                                    onClick={() => handleApprove(req.requestId, false)}
                                  >
                                      <Cancel />
                                  </IconButton>
                              </Stack>
                          )}
                      </TableCell>
                  )}
                </TableRow>
              ))}
              {requests.length === 0 && <TableRow><TableCell colSpan={6} align="center">ไม่มีข้อมูล</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Requests;