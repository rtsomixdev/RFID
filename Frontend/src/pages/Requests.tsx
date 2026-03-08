import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Select, MenuItem, Chip, Tabs, Tab,
  Stack, ToggleButton, ToggleButtonGroup, Card, CardContent,
  FormHelperText, Tooltip, useTheme, alpha, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Collapse, Divider, TablePagination
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle, Cancel, Send, AccessTime, Autorenew,
  Assignment, AddCircle, Warning, Inventory2, Refresh,
  LocalShipping, DoneAll, ListAlt, KeyboardReturn, PersonSearch,
  KeyboardArrowDown, KeyboardArrowUp, ContentPasteSearch,
  Category, ProductionQuantityLimits
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// --- Sub-Component: Row สำหรับ Tracking Control (เพื่อแยก State การหุบ/ขยาย ของแต่ละแถว) ---
const TrackingRow = (props: {
  req: any,
  canManageDelivery: boolean,
  handleOpenDeliveryDialog: (id: number) => void,
  handleConfirmArrival: (id: number, isReturn: boolean) => void
}) => {
  const { req, canManageDelivery, handleOpenDeliveryDialog, handleConfirmArrival } = props;
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  // ฟังก์ชันช่วยจัดรูปแบบเวลา
  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: open ? alpha(theme.palette.primary.main, 0.04) : 'inherit' }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: open ? 'primary.main' : 'text.secondary' }}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace', fontSize: '1rem' }}>
            {req.requestCode}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            {req.requestType === 1 && <Chip label="เบิกใหม่" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
            {req.requestType === 2 && <Chip label="เปลี่ยนชำรุด" size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
            {req.requestType === 3 && <Chip label="ส่งคืนผ้า" size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
          </Box>
        </TableCell>
        <TableCell>
          <Chip label={req.targetWard?.wardName || '-'} color={req.requestType === 3 ? "default" : "primary"} variant="outlined" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }} />
        </TableCell>
        <TableCell>
          <Stepper activeStep={req.currentStatusId === 2 ? 0 : req.currentStatusId === 4 ? 1 : 2} alternativeLabel sx={{ '& .MuiStepLabel-label': { mt: 0.5 } }}>
            <Step>
              <StepLabel>
                เตรียมผ้า
                <Typography display="block" variant="caption" color="textSecondary">
                  {req.createdAt ? formatTime(req.createdAt) : '-'}
                </Typography>
              </StepLabel>
            </Step>
            <Step>
              <StepLabel optional={
                (req.currentStatusId === 4 || req.currentStatusId === 5) && req.status && req.status !== 'Pending' ? (
                  <>
                    <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <PersonSearch fontSize="inherit" /> {req.status}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      เริ่ม: {req.currentStatusId >= 4 ? formatTime(req.updatedAt) : '-'}
                    </Typography>
                  </>
                ) : null
              }>
                กำลังเข็นไปส่ง
              </StepLabel>
            </Step>
            <Step>
              <StepLabel optional={
                req.currentStatusId === 5 ? (
                  <Typography variant="caption" color="success.main" display="block" fontWeight="bold">
                    ถึง: {formatTime(req.updatedAt)}
                  </Typography>
                ) : null
              }>
                ถึงวอร์ด
              </StepLabel>
            </Step>
          </Stepper>
        </TableCell>
        <TableCell align="center">
          {canManageDelivery ? (
            req.currentStatusId === 2 ? (
              <Button variant="contained" color="primary" size="small" startIcon={<LocalShipping />} onClick={() => handleOpenDeliveryDialog(req.requestId)} sx={{ borderRadius: 2, fontWeight: 'bold', px: 2 }}>
                เริ่มนำส่ง
              </Button>
            ) : req.currentStatusId === 4 ? (
              <Button variant="contained" color="success" size="small" startIcon={<CheckCircle />} onClick={() => handleConfirmArrival(req.requestId, req.requestType === 3)} sx={{ borderRadius: 2, fontWeight: 'bold', px: 2 }}>
                ถึงเป้าหมาย
              </Button>
            ) : null
          ) : (
            <Typography variant="caption" color="textSecondary">รอเจ้าหน้าที่จัดส่ง</Typography>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, ml: 6, p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px dashed #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontSize: '0.95rem', fontWeight: 'bold' }}>
                <ContentPasteSearch color="action" /> รายการสินค้าที่ต้องนำส่ง ({req.requestItems?.length || 0} รายการ)
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {req.requestItems?.map((item: any, idx: number) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #eee', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, transition: 'all 0.2s', '&:hover': { borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                        <Category />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {item.product?.productName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip label={item.product?.category?.categoryName} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fff', border: '1px solid #e0e0e0' }} />
                          {item.product?.sizeSpec && <Typography variant="caption" color="text.secondary">| {item.product.sizeSpec}</Typography>}
                        </Stack>
                        {item.damageReason && (
                          <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Warning fontSize="inherit" /> ชำรุด: {item.damageReason.reasonName}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" color="primary" fontWeight="bold">
                          {item.quantityRequested || item.quantity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.unitName}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ mt: 2, pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  * กรุณาตรวจสอบจำนวนสินค้าให้ครบถ้วนก่อนทำการนำส่ง
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// --- Main Component ---
const Requests: React.FC = () => {
  const theme = useTheme();

  const userStr = localStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const permissions = currentUser?.permissions || currentUser?.Permissions || [];
  const roleId = currentUser?.roleId || currentUser?.RoleId || 0;

  const canWrite = roleId === 1 || permissions.includes('WRITE_REQUEST');
  const isAdmin = roleId === 1 || permissions.includes('MANAGE_REQUEST') || permissions.includes('APPROVE_REQUEST');

  // ✅ เพิ่มตัวแปรเช็คสิทธิ์สำหรับพนักงานจัดส่ง
  const canManageDelivery = roleId === 1 || permissions.includes('MANAGE_DELIVERY') || permissions.includes('MANAGE_REQUEST');

  // สถานะ (States) ของระบบ
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const [currentStock, setCurrentStock] = useState<number | null>(null);

  const [requestType, setRequestType] = useState('1');
  const [formData, setFormData] = useState({
    categoryId: '', productId: '', wardId: '', quantity: '', damageReasonId: ''
  });

  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [trackingNote, setTrackingNote] = useState('');

  const [page1, setPage1] = useState(0);
  const [rowsPerPage1, setRowsPerPage1] = useState(10);
  const handleChangePage1 = (event: unknown, newPage: number) => setPage1(newPage);
  const handleChangeRowsPerPage1 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage1(+event.target.value);
    setPage1(0);
  };

  const [page2, setPage2] = useState(0);
  const [rowsPerPage2, setRowsPerPage2] = useState(10);
  const handleChangePage2 = (event: unknown, newPage: number) => setPage2(newPage);
  const handleChangeRowsPerPage2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage2(+event.target.value);
    setPage2(0);
  };

  const filteredProducts = products.filter(p =>
    !formData.categoryId || p.categoryId === Number(formData.categoryId)
  );

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      if (currentUser.wardId) {
        setFormData(prev => ({ ...prev, wardId: currentUser.wardId }));
      }
    }
    fetchMasterData();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData.productId) {
      checkStock(parseInt(formData.productId));
    } else {
      setCurrentStock(null);
    }
  }, [formData.productId]);

  const checkStock = async (prodId: number) => {
    try {
      const res = await axiosClient.get(`/Request/CheckStock/${prodId}`);
      setCurrentStock(res.data.available);
    } catch (error) {
      console.error("Check Stock Error", error);
      setCurrentStock(null);
    }
  };

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
    setLoading(true);
    try {
      const res = await axiosClient.get('/Request');
      let data = res.data || [];
      if (!isAdmin && currentUser) {
        data = data.filter((r: any) => r.requestedByUserId === currentUser.userId);
      }
      setRequests(data.sort((a: any, b: any) => b.requestId - a.requestId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !user.userId) return Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน (กรุณา Login ใหม่)', 'error');
    if (!formData.productId || !formData.quantity || !formData.wardId) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');

    const qty = parseInt(formData.quantity);
    if (qty <= 0) return Swal.fire('แจ้งเตือน', 'จำนวนต้องมากกว่า 0', 'warning');

    const typeId = parseInt(requestType);

    if (typeId !== 3 && currentStock !== null && qty > currentStock) {
      return Swal.fire('ของไม่พอ!', `สินค้าชิ้นนี้เหลือเพียง ${currentStock} ชิ้นในคลัง`, 'error');
    }

    const productId = parseInt(formData.productId);
    const wardId = parseInt(formData.wardId);

    if (typeId === 2 && !formData.damageReasonId) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุสาเหตุที่ชำรุด', 'warning');
    }

    let damageReasonId: number | null = null;
    if (typeId === 2 && formData.damageReasonId) damageReasonId = parseInt(formData.damageReasonId);

    const payload = {
      requestType: typeId,
      requestedByUserId: user.userId,
      targetWardId: wardId,
      currentStatusId: 1,
      requestItems: [{
        product_id: productId,
        quantity: qty,
        damage_reason_id: damageReasonId
      }]
    };

    try {
      await axiosClient.post('/Request', payload);
      Swal.fire({ icon: 'success', title: 'ส่งคำร้องเรียบร้อย', text: 'กรุณารอเจ้าหน้าที่อนุมัติ', timer: 1500, showConfirmButton: false });

      const typeText = typeId === 1 ? 'เบิกผ้า' : typeId === 2 ? 'เปลี่ยนผ้า' : 'ส่งคืนผ้า';
      const productName = products.find(p => p.productId === productId)?.productName || 'สินค้า';
      const wardName = wards.find(w => w.wardId === wardId)?.wardName || 'วอร์ด';

      await sendNotification(
        `มีคำร้อง${typeText}ใหม่`,
        `${wardName} ขอ${typeText} ${productName} จำนวน ${qty} ชิ้น`,
        'INFO', '/requests', undefined, 1
      );

      setFormData(prev => ({ ...prev, categoryId: '', productId: '', quantity: '', damageReasonId: '' }));
      setCurrentStock(null);
      fetchRequests();

    } catch (err: any) {
      const msg = err.response?.data?.message || 'ไม่สามารถส่งคำร้องได้';
      Swal.fire('Error', msg, 'error');
    }
  };

  const handleApprove = async (reqId: number, isApprove: boolean) => {
    const action = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
    const confirmColor = isApprove ? theme.palette.success.main : theme.palette.error.main;

    Swal.fire({
      title: `ยืนยันการ${action}?`,
      text: isApprove ? "เมื่ออนุมัติแล้ว รายการจะไปอยู่ในแท็บ 'เตรียมนำส่ง'" : "คำร้องจะถูกยกเลิก",
      icon: isApprove ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      confirmButtonText: `ยืนยัน${action}`,
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const currentReq = requests.find(r => r.requestId === reqId);
          if (!currentReq) return;

          await axiosClient.put(`/Request/${reqId}`, {
            requestId: reqId,
            currentStatusId: isApprove ? 2 : 3,
            requestType: currentReq.requestType,
            requestedByUserId: currentReq.requestedByUserId,
            targetWardId: currentReq.targetWardId,
            requestCode: currentReq.requestCode
          });

          Swal.fire({ icon: 'success', title: `บันทึกสถานะ "${action}" เรียบร้อย`, timer: 1500, showConfirmButton: false });

          const statusText = isApprove ? 'ได้รับการอนุมัติแล้ว' : 'ถูกปฏิเสธ';
          const notiType = isApprove ? 'SUCCESS' : 'DANGER';

          await sendNotification(
            `คำร้อง ${currentReq.requestCode} ${statusText}`,
            `รายการของคุณได้รับการตรวจสอบโดย ${user?.firstName || 'เจ้าหน้าที่'}`,
            notiType, '/requests', currentReq.requestedByUserId
          );

          fetchRequests();
        } catch (apiErr: any) {
          Swal.fire('Error', 'ไม่สามารถบันทึกสถานะได้ (อาจเกิดจากของไม่พอ)', 'error');
        }
      }
    });
  };

  const handleOpenDeliveryDialog = (reqId: number) => {
    setSelectedReqId(reqId);
    setTrackingNote('');
    setOpenDeliveryDialog(true);
  };

  const handleStartDelivery = async () => {
    if (!selectedReqId) return;
    try {
      await axiosClient.put(`/Request/${selectedReqId}/update-tracking`, {
        newStatusId: 4,
        trackingNote: trackingNote || '-'
      });
      setOpenDeliveryDialog(false);
      Swal.fire({ icon: 'success', title: 'เริ่มนำส่งผ้าแล้ว', timer: 1500, showConfirmButton: false });
      fetchRequests();
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถอัปเดตสถานะนำส่งได้', 'error');
    }
  };

  const handleConfirmArrival = async (reqId: number, isReturn: boolean) => {
    Swal.fire({
      title: isReturn ? 'ยืนยันการรับผ้าคืน?' : 'ยืนยันผ้าถึงวอร์ดเป้าหมาย?',
      text: isReturn ? "ยืนยันว่าได้รับผ้าคืนกลับเข้าคลังเรียบร้อยแล้ว" : "ยืนยันว่าได้ส่งมอบผ้าให้พยาบาลที่วอร์ดเรียบร้อยแล้ว",
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: isReturn ? theme.palette.info.main : theme.palette.primary.main,
      confirmButtonText: isReturn ? 'ยืนยันรับคืน' : 'ยืนยันถึงที่หมาย',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const currentReq = requests.find(r => r.requestId === reqId);
          if (!currentReq) return;

          await axiosClient.put(`/Request/${reqId}/update-tracking`, {
            newStatusId: 5,
            trackingNote: currentReq.status
          });

          Swal.fire({ icon: 'success', title: isReturn ? 'รับคืนเรียบร้อย' : 'ส่งผ้าถึงวอร์ดแล้ว', timer: 1500, showConfirmButton: false });

          await sendNotification(
            isReturn ? `รับคืนผ้าเสร็จสิ้น (${currentReq.requestCode})` : `ผ้าส่งถึงวอร์ดแล้ว (${currentReq.requestCode})`,
            isReturn ? `เจ้าหน้าที่ได้รับผ้าคืนกลับเข้าคลังแล้ว` : `เจ้าหน้าที่นำผ้าไปส่งถึงวอร์ดของท่านเรียบร้อยแล้ว`,
            'SUCCESS', '/requests', currentReq.requestedByUserId
          );

          fetchRequests();
        } catch (apiErr) {
          Swal.fire('Error', 'ไม่สามารถอัปเดตสถานะได้', 'error');
        }
      }
    });
  };

  const getStatusChip = (statusId: number) => {
    switch (statusId) {
      case 1: return <Chip icon={<AccessTime />} label="รออนุมัติ" color="warning" variant="outlined" size="small" />;
      case 2: return <Chip icon={<CheckCircle />} label="รอคนนำส่ง" color="primary" size="small" variant="outlined" />;
      case 3: return <Chip icon={<Cancel />} label="ถูกปฏิเสธ" color="error" size="small" variant="filled" />;
      case 4: return <Chip icon={<LocalShipping />} label="กำลังเข็นไปส่ง" color="info" size="small" variant="filled" />;
      case 5: return <Chip icon={<DoneAll />} label="เสร็จสิ้น" color="success" size="small" variant="filled" />;
      case 99: return <Chip icon={<Cancel />} label="ยกเลิก" color="default" size="small" variant="filled" />;
      default: return <Chip label="Unknown" size="small" />;
    }
  };

  // Helper สำหรับจัดรูปแบบเวลา
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }) + ' น.';
  };

  const activeDeliveryRequests = requests.filter(req => req.currentStatusId === 2 || req.currentStatusId === 4);

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="ระบบจัดการคำร้อง (Request)"
        subtitle="สร้างคำร้องและจัดการรายการเบิก/เปลี่ยนผ้า"
        icon={<Assignment fontSize="large" />}
        breadcrumbs={[{ label: 'หน้าหลัก', href: '/' }, { label: 'คำร้อง' }]}
      />

      <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary">
          <Tab icon={<AddCircle />} label="1. คำร้องเบิก/เปลี่ยนผ้า (Requests)" iconPosition="start" sx={{ fontWeight: 'bold' }} />
          {/* ✅ ซ่อนแท็บนี้ถ้าไม่มีสิทธิ์ MANAGE_DELIVERY */}
          {canManageDelivery && (
            <Tab icon={<ListAlt />} label={`2. ควบคุมการนำส่ง (${activeDeliveryRequests.length})`} iconPosition="start" sx={{ fontWeight: 'bold' }} />
          )}
        </Tabs>
      </Paper>

      {/* แท็บ 0: ฟอร์มสร้างคำร้อง และ ตารางประวัติ */}
      <Box role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <>
            {canWrite && (
              <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Send color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                    แบบฟอร์มสร้างคำร้อง (ระบุตามลำดับ)
                  </Typography>
                </Box>
                <CardContent sx={{ p: 4 }}>
                  <Grid container spacing={3} alignItems="flex-start">
                    <Grid item xs={12} md={4}>
                      <FormLabel label="1. ประเภทคำร้อง">
                        <ToggleButtonGroup color="primary" value={requestType} exclusive
                          onChange={(e, v) => { if (v) { setRequestType(v); setFormData({ ...formData, damageReasonId: '' }); } }}
                          fullWidth size="small">
                          <ToggleButton value="1">เบิกใหม่</ToggleButton>
                          <ToggleButton value="2">เปลี่ยนชำรุด</ToggleButton>
                          <ToggleButton value="3">ส่งคืนผ้า</ToggleButton>
                        </ToggleButtonGroup>
                      </FormLabel>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormLabel label="2. วอร์ด/แผนก" required>
                        <Select value={formData.wardId} onChange={e => setFormData({ ...formData, wardId: e.target.value.toString(), categoryId: '', productId: '', quantity: '' })} displayEmpty fullWidth>
                          <MenuItem value="" disabled>เลือกวอร์ด (Step 1)</MenuItem>
                          {wards.map((w) => <MenuItem key={w.wardId} value={w.wardId}>{w.wardName}</MenuItem>)}
                        </Select>
                      </FormLabel>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormLabel label="3. หมวดผ้า" required>
                        <Select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value.toString(), productId: '', quantity: '' })} displayEmpty fullWidth disabled={!formData.wardId}>
                          <MenuItem value="" disabled>เลือกหมวดผ้า (Step 2)</MenuItem>
                          {categories.map((c) => <MenuItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</MenuItem>)}
                        </Select>
                      </FormLabel>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormLabel label="4. รายการผ้า" required>
                        <Select value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value.toString(), quantity: '' })} displayEmpty fullWidth disabled={!formData.categoryId}>
                          <MenuItem value="" disabled>เลือกสินค้า (Step 3)</MenuItem>
                          {filteredProducts.map((p) => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                        </Select>
                        {currentStock !== null && requestType !== '3' && (
                          <FormHelperText sx={{ color: currentStock > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                            <Inventory2 fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> คงเหลือที่เบิกได้: {currentStock} ชิ้น
                          </FormHelperText>
                        )}
                        {requestType === '3' && formData.productId && (
                          <FormHelperText sx={{ color: 'info.main', fontWeight: 'bold' }}>
                            <Inventory2 fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> ระบุจำนวนผ้าส่วนเกินที่ต้องการส่งคืนคลัง
                          </FormHelperText>
                        )}
                      </FormLabel>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <FormLabel label={requestType === '3' ? "5. จำนวนที่ส่งคืน" : "5. จำนวนที่เบิก"} required>
                        <TextField fullWidth type="number" placeholder="ระบุจำนวน (Step 4)" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} disabled={!formData.productId} InputProps={{ inputProps: { min: 1, max: requestType === '3' ? 9999 : (currentStock || 999) } }} error={requestType !== '3' && currentStock !== null && Number(formData.quantity) > currentStock} helperText={requestType !== '3' && currentStock !== null && Number(formData.quantity) > currentStock ? "เกินจำนวนที่มีในคลัง" : ""} />
                      </FormLabel>
                    </Grid>

                    {requestType === '2' && (
                      <Grid item xs={12} md={4}>
                        <FormLabel label="สาเหตุชำรุด (สำหรับเปลี่ยนผ้า)" required>
                          <Select value={formData.damageReasonId} onChange={e => setFormData({ ...formData, damageReasonId: e.target.value.toString() })} displayEmpty fullWidth disabled={!formData.productId} error={!formData.damageReasonId}>
                            <MenuItem value="" disabled>เลือกสาเหตุ</MenuItem>
                            {reasons.map((r) => <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>)}
                          </Select>
                        </FormLabel>
                      </Grid>
                    )}

                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                      <Button variant="outlined" color="inherit" size="large" onClick={() => setFormData({ categoryId: '', productId: '', wardId: '', quantity: '', damageReasonId: '' })}>ล้างข้อมูล</Button>
                      <Button variant="contained" size="large" onClick={handleSubmit} startIcon={requestType === '1' ? <AddCircle /> : requestType === '2' ? <Autorenew /> : <KeyboardReturn />} sx={{ px: 4 }} disabled={requestType !== '3' && currentStock !== null && (currentStock === 0 || Number(formData.quantity) > currentStock)}>
                        {requestType === '1' ? 'ส่งคำร้องเบิก' : requestType === '2' ? 'ส่งคำร้องเปลี่ยน' : 'ส่งคำร้องคืนผ้า'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">
                    {isAdmin ? 'รายการรออนุมัติ / ประวัติทั้งหมด' : 'ประวัติคำร้องของฉัน'}
                  </Typography>
                  <Chip label={`${requests.length} รายการ`} size="small" color="default" sx={{ fontWeight: 'bold' }} />
                </Box>
                <Button startIcon={<Refresh />} onClick={fetchRequests} size="small" variant="outlined">รีเฟรชข้อมูล</Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>เลขที่ / วันที่</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '20%', bgcolor: '#f8fafc' }}>ผู้เบิก / แผนก</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '35%', bgcolor: '#f8fafc' }}>รายละเอียดสินค้า</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>ไม่พบข้อมูลคำร้อง</TableCell></TableRow>
                    ) : requests.slice(page1 * rowsPerPage1, page1 * rowsPerPage1 + rowsPerPage1).map((req) => (
                      <TableRow key={req.requestId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {req.requestCode}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(req.createdAt).toLocaleDateString('th-TH')} <br />
                            {new Date(req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {req.targetWard?.wardName || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ผู้เบิก: {req.requestedByUser?.firstName}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {req.requestType === 1 && <Chip label="เบิกใหม่" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                            {req.requestType === 2 && <Chip label="เปลี่ยนชำรุด" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                            {req.requestType === 3 && <Chip label="ส่งคืนผ้า" size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                          </Box>
                        </TableCell>

                        <TableCell>
                          {req.requestItems?.map((item: any, idx: number) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5, borderBottom: idx !== req.requestItems.length - 1 ? '1px dashed #eee' : 'none' }}>
                              <Box sx={{ minWidth: 60, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 2 }}>
                                <Typography variant="subtitle1" color="primary" fontWeight="bold" lineHeight={1}>
                                  {item.quantityRequested || item.quantity || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  {item.product?.unitName || 'ชิ้น'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight="bold" color="text.primary">
                                  {item.product?.productName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>
                                  หมวดหมู่: {item.product?.category?.categoryName || '-'}
                                </Typography>
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                  {item.product?.sizeSpec && <Chip label={`ไซส์: ${item.product.sizeSpec}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
                                  {item.product?.color && <Chip label={`สี: ${item.product.color}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
                                </Stack>
                              </Box>
                            </Box>
                          ))}
                        </TableCell>

                        <TableCell align="center">
                          {getStatusChip(req.currentStatusId)}

                          {/* แสดงเวลาถึงสำหรับสถานะเสร็จสิ้น (>= 5) */}
                          {req.currentStatusId >= 5 && req.updatedAt && (
                            <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                              ถึง: {formatDateTime(req.updatedAt)}
                            </Typography>
                          )}

                          {/* แสดงผู้จัดส่งสำหรับสถานะ >= 4 */}
                          {(req.currentStatusId >= 4) && req.status && req.status !== 'Pending' && (
                            <Box sx={{ mt: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', px: 1, py: 0.5, borderRadius: 1 }}>
                              <LocalShipping sx={{ fontSize: '1rem' }} />
                              <Typography variant="caption" fontWeight="bold" noWrap>
                                ผู้ส่ง: {req.status}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {isAdmin && req.currentStatusId === 1 ? (
                              <>
                                <Tooltip title="อนุมัติ">
                                  <IconButton size="small" sx={{ color: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.1) }} onClick={() => handleApprove(req.requestId, true)}>
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="ปฏิเสธ">
                                  <IconButton size="small" sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1) }} onClick={() => handleApprove(req.requestId, false)}>
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                {req.currentStatusId >= 2 ? 'ดำเนินการแล้ว' : '-'}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={requests.length}
                rowsPerPage={rowsPerPage1}
                page={page1}
                onPageChange={handleChangePage1}
                onRowsPerPageChange={handleChangeRowsPerPage1}
              />
            </Card>
          </>
        )}
      </Box>

      {/* แท็บ 1: ศูนย์ควบคุมการจัดส่งสถานะ (Tracking Progress) */}
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.info.light}` }}>
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LocalShipping color="info" />
                <Typography variant="h6" fontWeight="bold" color="info.main">
                  ศูนย์ควบคุมการนำส่ง (Tracking Control)
                </Typography>
              </Box>
              <Button startIcon={<Refresh />} onClick={fetchRequests} size="small" variant="outlined" color="info">รีเฟรชข้อมูล</Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '50px' }} /> {/* ช่องสำหรับปุ่ม Expand */}
                    <TableCell sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>ข้อมูลคำร้อง</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '20%', bgcolor: '#f8fafc' }}>เป้าหมาย / วอร์ด</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '40%', bgcolor: '#f8fafc' }}>สถานะการเดินทาง (Timeline)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '20%', bgcolor: '#f8fafc' }}>จัดการการนำส่ง</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                  ) : activeDeliveryRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>ไม่มีรายการค้างส่งในขณะนี้</TableCell></TableRow>
                  ) : activeDeliveryRequests.slice(page2 * rowsPerPage2, page2 * rowsPerPage2 + rowsPerPage2).map((req) => (
                    <TrackingRow
                      key={req.requestId}
                      req={req}
                      canManageDelivery={canManageDelivery} // ✅ ส่ง Props ที่อัปเดตแล้ว
                      handleOpenDeliveryDialog={handleOpenDeliveryDialog}
                      handleConfirmArrival={handleConfirmArrival}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={activeDeliveryRequests.length}
              rowsPerPage={rowsPerPage2}
              page={page2}
              onPageChange={handleChangePage2}
              onRowsPerPageChange={handleChangeRowsPerPage2}
            />
          </Card>
        )}
      </Box>

      <Dialog open={openDeliveryDialog} onClose={() => setOpenDeliveryDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShipping color="primary" /> ระบุผู้รับผิดชอบการนำส่ง
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            กรุณาระบุชื่อพนักงานที่เข็นผ้าไปส่ง เพื่อใช้สำหรับติดตามสถานะ (Tracking)
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="ชื่อพนักงานเข็นผ้า / ผู้รับผิดชอบ"
            fullWidth
            variant="outlined"
            value={trackingNote}
            onChange={(e) => setTrackingNote(e.target.value)}
            placeholder="เช่น สมชาย, มานี หรือ รหัสพนักงาน"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeliveryDialog(false)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleStartDelivery} variant="contained" disabled={!trackingNote.trim()}>
            ยืนยันเริ่มนำส่ง
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Requests;