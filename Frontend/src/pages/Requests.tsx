import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Select, MenuItem, Chip, Tabs, Tab,
    Stack, ToggleButton, ToggleButtonGroup, Card, CardContent,
    FormHelperText, Tooltip, useTheme, alpha, CircularProgress, Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    CheckCircle, Cancel, Send, AccessTime, Autorenew,
    Assignment, AddCircle, Warning, Inventory2, Refresh,
    LocalShipping, DoneAll, ListAlt, KeyboardReturn
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

const Requests: React.FC = () => {
    const theme = useTheme();
    // --- States ---
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [reasons, setReasons] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);

    // Stock
    const [currentStock, setCurrentStock] = useState<number | null>(null);

    // Form
    const [requestType, setRequestType] = useState('1'); // 1=เบิก, 2=เปลี่ยน, 3=ส่งคืน
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
            // Admin roleId = 1 or 2
            const adminRole = currentUser.roleId === 1 || currentUser.roleId === 2;
            setIsAdmin(adminRole);

            if (currentUser.wardId) {
                setFormData(prev => ({ ...prev, wardId: currentUser.wardId }));
            }
        }
        fetchMasterData();
        fetchRequests();
    }, []);

    // Check stock when product changes
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
            setRequests(res.data.sort((a: any, b: any) => b.requestId - a.requestId));
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

        // Validation: Stock Check (เฉพาะการเบิกและการเปลี่ยนผ้าเท่านั้น, คืนผ้าไม่ต้องเช็ค)
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
            currentStatusId: 1, // 1 = Waiting/Pending
            requestItems: [{
                product_id: productId,
                quantity: qty,
                damage_reason_id: damageReasonId
            }]
        };

        try {
            await axiosClient.post('/Request', payload);

            Swal.fire({
                icon: 'success',
                title: 'ส่งคำร้องเรียบร้อย',
                text: 'กรุณารอเจ้าหน้าที่อนุมัติ',
                timer: 1500,
                showConfirmButton: false
            });

            const typeText = typeId === 1 ? 'เบิกผ้า' : typeId === 2 ? 'เปลี่ยนผ้า' : 'ส่งคืนผ้า';
            const productName = products.find(p => p.productId === productId)?.productName || 'สินค้า';
            const wardName = wards.find(w => w.wardId === wardId)?.wardName || 'วอร์ด';

            await sendNotification(
                `มีคำร้อง${typeText}ใหม่`,
                `${wardName} ขอ${typeText} ${productName} จำนวน ${qty} ชิ้น`,
                'INFO',
                '/requests',
                undefined,
                1 
            );

            // Reset Form (กลับไปจุดเริ่มต้น)
            setFormData(prev => ({ ...prev, categoryId: '', productId: '', quantity: '', damageReasonId: '' }));
            setCurrentStock(null);
            fetchRequests();

        } catch (err: any) {
            const msg = err.response?.data?.message || 'ไม่สามารถส่งคำร้องได้';
            Swal.fire('Error', msg, 'error');
        }
    };

    // --- Approve / Reject Logic ---
    const handleApprove = async (reqId: number, isApprove: boolean) => {
        const action = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
        const confirmColor = isApprove ? theme.palette.success.main : theme.palette.error.main;

        Swal.fire({
            title: `ยืนยันการ${action}?`,
            text: isApprove ? "เมื่ออนุมัติแล้ว รายการจะไปอยู่ในแท็บ 'เตรียมจัดส่ง'" : "คำร้องจะถูกยกเลิก",
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
                        currentStatusId: isApprove ? 2 : 3, // 2=Approved, 3=Rejected
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
                        `รายการของคุณได้รับการตรวจสอบโดย ${user.firstName}`,
                        notiType,
                        '/requests',
                        currentReq.requestedByUserId
                    );

                    fetchRequests(); 

                } catch (apiErr: any) {
                    Swal.fire('Error', 'ไม่สามารถบันทึกสถานะได้ (อาจเกิดจากของไม่พอ)', 'error');
                }
            }
        });
    };

    // --- ยืนยันการจัดส่งผ้า (Dispatch) ---
    const handleConfirmDispatch = async (reqId: number) => {
        Swal.fire({
            title: 'ยืนยันการจัดส่ง?',
            text: "ยืนยันว่าได้ทำการจัดส่งผ้าตามใบเบิกนี้เรียบร้อยแล้ว",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: theme.palette.info.main,
            confirmButtonText: 'ยืนยันจัดส่ง',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const currentReq = requests.find(r => r.requestId === reqId);
                    if (!currentReq) return;

                    await axiosClient.put(`/Request/${reqId}`, {
                        requestId: reqId,
                        currentStatusId: 4, // 4 = ส่งมอบแล้ว / เสร็จสิ้น
                        requestType: currentReq.requestType,
                        requestedByUserId: currentReq.requestedByUserId,
                        targetWardId: currentReq.targetWardId,
                        requestCode: currentReq.requestCode
                    });

                    Swal.fire({ icon: 'success', title: 'ยืนยันการจัดส่งแล้ว', timer: 1500, showConfirmButton: false });
                    
                    await sendNotification(
                        `กำลังจัดส่งผ้า (${currentReq.requestCode})`,
                        `เจ้าหน้าที่กำลังนำผ้าไปส่งที่แผนกของท่าน`,
                        'WARNING',
                        '/requests',
                        currentReq.requestedByUserId
                    );

                    fetchRequests();
                } catch (apiErr) {
                    Swal.fire('Error', 'ไม่สามารถอัปเดตสถานะจัดส่งได้', 'error');
                }
            }
        });
    };

    const getStatusChip = (statusId: number) => {
        switch (statusId) {
            case 1: return <Chip icon={<AccessTime />} label="รออนุมัติ" color="warning" variant="outlined" size="small" />;
            case 2: return <Chip icon={<CheckCircle />} label="อนุมัติแล้ว (รอส่ง)" color="success" size="small" variant="filled" />;
            case 3: return <Chip icon={<Cancel />} label="ถูกปฏิเสธ" color="error" size="small" variant="filled" />;
            case 4: return <Chip icon={<DoneAll />} label="จัดส่งเรียบร้อย" color="info" size="small" variant="filled" />;
            default: return <Chip label="Unknown" size="small" />;
        }
    };

    // Filter เฉพาะใบที่อนุมัติแล้ว (เตรียมส่ง) สำหรับ Tab 2
    const approvedRequests = requests.filter(req => req.currentStatusId === 2);

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="ระบบจัดการคำร้อง (Request)"
                subtitle="สร้างคำร้องและจัดการรายการเบิก/เปลี่ยนผ้า"
                icon={<Assignment fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'คำร้อง' }
                ]}
            />

            <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={(e, v) => setTabValue(v)} 
                    indicatorColor="primary" 
                    textColor="primary"
                >
                    <Tab icon={<AddCircle />} label="1. คำร้องเบิก/เปลี่ยนผ้า (Requests)" iconPosition="start" sx={{ fontWeight: 'bold' }} />
                    <Tab icon={<ListAlt />} label={`2. รายการเตรียมจัดส่ง (${approvedRequests.length})`} iconPosition="start" sx={{ fontWeight: 'bold' }} />
                </Tabs>
            </Paper>

            {/* ========================================== */}
            {/* TAB 0: ฟอร์มสร้างคำร้อง + ตารางประวัติ/อนุมัติ */}
            {/* ========================================== */}
            <Box role="tabpanel" hidden={tabValue !== 0}>
                {tabValue === 0 && (
                    <>
                        {/* ส่วน Form (Create New Request) */}
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
                                            <ToggleButtonGroup
                                                color="primary"
                                                value={requestType}
                                                exclusive
                                                onChange={(e, v) => {
                                                    if(v) {
                                                        setRequestType(v);
                                                        setFormData({ ...formData, damageReasonId: '' });
                                                    }
                                                }}
                                                fullWidth
                                                size="small"
                                            >
                                                <ToggleButton value="1">เบิกใหม่</ToggleButton>
                                                <ToggleButton value="2">เปลี่ยนชำรุด</ToggleButton>
                                                <ToggleButton value="3">ส่งคืนผ้าส่วนเกิน</ToggleButton>
                                            </ToggleButtonGroup>
                                        </FormLabel>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <FormLabel label="2. วอร์ด/แผนก" required>
                                            <Select
                                                value={formData.wardId}
                                                onChange={e => setFormData({ ...formData, wardId: e.target.value.toString(), categoryId: '', productId: '', quantity: '' })}
                                                displayEmpty
                                                fullWidth
                                            >
                                                <MenuItem value="" disabled>เลือกวอร์ด (Step 1)</MenuItem>
                                                {wards.map((w) => <MenuItem key={w.wardId} value={w.wardId}>{w.wardName}</MenuItem>)}
                                            </Select>
                                        </FormLabel>
                                    </Grid>

                                    {/* ล็อค: ต้องเลือกวอร์ดก่อน */}
                                    <Grid item xs={12} md={4}>
                                        <FormLabel label="3. หมวดผ้า" required>
                                            <Select
                                                value={formData.categoryId}
                                                onChange={e => setFormData({ ...formData, categoryId: e.target.value.toString(), productId: '', quantity: '' })}
                                                displayEmpty
                                                fullWidth
                                                disabled={!formData.wardId} 
                                            >
                                                <MenuItem value="" disabled>เลือกหมวดผ้า (Step 2)</MenuItem>
                                                {categories.map((c) => <MenuItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</MenuItem>)}
                                            </Select>
                                        </FormLabel>
                                    </Grid>

                                    {/* ล็อค: ต้องเลือกหมวดหมู่ก่อน */}
                                    <Grid item xs={12} md={4}>
                                        <FormLabel label="4. รายการผ้า" required>
                                            <Select 
                                                value={formData.productId} 
                                                onChange={e => setFormData({ ...formData, productId: e.target.value.toString(), quantity: '' })} 
                                                displayEmpty
                                                fullWidth
                                                disabled={!formData.categoryId} 
                                            >
                                                <MenuItem value="" disabled>เลือกสินค้า (Step 3)</MenuItem>
                                                {filteredProducts.map((p) => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                                            </Select>
                                            
                                            {/* โชว์จำนวนในคลังเฉพาะตอนเบิกกับเปลี่ยน / คืนผ้าไม่ต้องเช็ค */}
                                            {currentStock !== null && requestType !== '3' && (
                                                <FormHelperText sx={{ color: currentStock > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                                                    <Inventory2 fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                                    คงเหลือที่เบิกได้: {currentStock} ชิ้น
                                                </FormHelperText>
                                            )}
                                            {requestType === '3' && formData.productId && (
                                                <FormHelperText sx={{ color: 'info.main', fontWeight: 'bold' }}>
                                                    <Inventory2 fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                                    ระบุจำนวนผ้าส่วนเกินที่ต้องการส่งคืนคลัง
                                                </FormHelperText>
                                            )}
                                        </FormLabel>
                                    </Grid>

                                    {/* ล็อค: ต้องเลือกสินค้าก่อน */}
                                    <Grid item xs={12} md={4}>
                                        <FormLabel label={requestType === '3' ? "5. จำนวนที่ส่งคืน (ชิ้น)" : "5. จำนวนที่เบิก (ชิ้น)"} required>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                placeholder="ระบุจำนวน (Step 4)"
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                                disabled={!formData.productId} 
                                                InputProps={{ inputProps: { min: 1, max: requestType === '3' ? 9999 : (currentStock || 999) } }}
                                                error={requestType !== '3' && currentStock !== null && Number(formData.quantity) > currentStock}
                                                helperText={requestType !== '3' && currentStock !== null && Number(formData.quantity) > currentStock ? "เกินจำนวนที่มีในคลัง" : ""}
                                            />
                                        </FormLabel>
                                    </Grid>

                                    {requestType === '2' && (
                                        <Grid item xs={12} md={4}>
                                            <FormLabel label="สาเหตุชำรุด (สำหรับเปลี่ยนผ้า)" required>
                                                <Select
                                                    value={formData.damageReasonId}
                                                    onChange={e => setFormData({ ...formData, damageReasonId: e.target.value.toString() })}
                                                    displayEmpty
                                                    fullWidth
                                                    disabled={!formData.productId}
                                                    error={!formData.damageReasonId}
                                                >
                                                    <MenuItem value="" disabled>เลือกสาเหตุ</MenuItem>
                                                    {reasons.map((r) => <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>)}
                                                </Select>
                                            </FormLabel>
                                        </Grid>
                                    )}

                                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                                        <Button variant="outlined" color="inherit" size="large" onClick={() => setFormData({ categoryId: '', productId: '', wardId: '', quantity: '', damageReasonId: '' })}>ล้างข้อมูล</Button>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleSubmit}
                                            startIcon={requestType === '1' ? <AddCircle /> : requestType === '2' ? <Autorenew /> : <KeyboardReturn />}
                                            sx={{ px: 4 }}
                                            disabled={requestType !== '3' && currentStock !== null && (currentStock === 0 || Number(formData.quantity) > currentStock)}
                                        >
                                            {requestType === '1' ? 'ส่งคำร้องเบิก' : requestType === '2' ? 'ส่งคำร้องเปลี่ยน' : 'ส่งคำร้องคืนผ้า'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* ส่วน Table (History & Approve) */}
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

                            <TableContainer sx={{ maxHeight: 600 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>เลขที่ / วันที่</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '20%', bgcolor: '#f8fafc' }}>ผู้เบิก / แผนก</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: '35%', bgcolor: '#f8fafc' }}>รายการสินค้า</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>จัดการ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                                        ) : requests.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>ไม่พบข้อมูลคำร้อง</TableCell></TableRow>
                                        ) : requests.map((req) => (
                                            <TableRow key={req.requestId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                                        {req.requestCode}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                                        <br />
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
                                                    {/* แสดงป้ายกำกับประเภทคำร้อง */}
                                                    <Box sx={{ mt: 0.5 }}>
                                                        {req.requestType === 1 && <Chip label="เบิกใหม่" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                                                        {req.requestType === 2 && <Chip label="เปลี่ยนชำรุด" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                                                        {req.requestType === 3 && <Chip label="ส่งคืนผ้า" size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {req.requestItems?.map((item: any, idx: number) => (
                                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: idx !== req.requestItems.length - 1 ? '1px dashed #eee' : 'none' }}>
                                                            <Box sx={{ minWidth: 50, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.1), p: 0.5, borderRadius: 2 }}>
                                                                <Typography variant="body2" color="primary" fontWeight="bold">
                                                                    {item.quantityRequested || item.quantity || 0}
                                                                </Typography>
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="500">
                                                                    {item.product?.productName} <Typography component="span" variant="caption" color="text.secondary">({item.product?.sizeSpec})</Typography>
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
                                                <TableCell align="center">
                                                    {getStatusChip(req.currentStatusId)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        {/* ปุ่มสำหรับ Admin: อนุมัติ / ปฏิเสธ (เมื่อสถานะ = 1 รออนุมัติ) */}
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
                                                            <Typography variant="caption" color="textSecondary">-</Typography>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    </>
                )}
            </Box>

            {/* ========================================== */}
            {/* TAB 1: ตารางรายการที่อนุมัติแล้ว (รอจัดส่ง) */}
            {/* ========================================== */}
            <Box role="tabpanel" hidden={tabValue !== 1}>
                {tabValue === 1 && (
                    <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.info.light}` }}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <LocalShipping color="info" />
                                <Typography variant="h6" fontWeight="bold" color="info.main">
                                    รายการรอจัดส่งไปวอร์ด (Ready to Dispatch)
                                </Typography>
                            </Box>
                            <Button startIcon={<Refresh />} onClick={fetchRequests} size="small" variant="outlined" color="info">รีเฟรชข้อมูล</Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '15%', bgcolor: '#f8fafc' }}>เลขที่คำร้อง</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '20%', bgcolor: '#f8fafc' }}>สถานที่จัดส่ง (วอร์ดปลายทาง)</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '40%', bgcolor: '#f8fafc' }}>รายการผ้าที่ต้องเตรียม</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '25%', bgcolor: '#f8fafc' }}>ยืนยันการจัดส่ง</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                                    ) : approvedRequests.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10, color: 'text.secondary' }}>ไม่มีรายการรอจัดส่งในขณะนี้</TableCell></TableRow>
                                    ) : approvedRequests.map((req) => (
                                        <TableRow key={req.requestId} hover sx={{ '& td': { py: 2 } }}>
                                            <TableCell>
                                                <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                                    {req.requestCode}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    อนุมัติเมื่อ: {new Date(req.updatedAt || req.createdAt).toLocaleString('th-TH')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={req.targetWard?.wardName || '-'} color="primary" variant="outlined" sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2 }} />
                                            </TableCell>
                                            <TableCell>
                                                {req.requestItems?.map((item: any, idx: number) => (
                                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: idx !== req.requestItems.length - 1 ? '1px dashed #eee' : 'none' }}>
                                                        <Box sx={{ minWidth: 50, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.1), p: 1, borderRadius: 2 }}>
                                                            <Typography variant="body1" color="info.main" fontWeight="bold">
                                                                {item.quantityRequested || item.quantity || 0}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body1" fontWeight="bold" color="text.primary">
                                                                {item.product?.productName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">ขนาด: {item.product?.sizeSpec || '-'}</Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button 
                                                    variant="contained" 
                                                    color="info" 
                                                    size="large" 
                                                    startIcon={<LocalShipping />}
                                                    onClick={() => handleConfirmDispatch(req.requestId)}
                                                    sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, py: 1 }}
                                                >
                                                    ส่งผ้าเรียบร้อย
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                )}
            </Box>

        </Box>
    );
};

export default Requests;