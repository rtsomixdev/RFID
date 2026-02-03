import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Select, MenuItem, FormControl, InputLabel, Chip,
    Stack, ToggleButton, ToggleButtonGroup, Card, CardContent,
    FormHelperText, Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    CheckCircle, Cancel, Send, AccessTime, Autorenew,
    Assignment, AddCircle, Warning, ListAlt, Inventory2
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

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

    // Stock
    const [currentStock, setCurrentStock] = useState<number | null>(null);

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
            // Role 1 = Admin (Can Approve/Reject)
            const adminRole = currentUser.roleId === 1 || currentUser.roleId === 2; // ให้สิทธิ์ทั้ง Admin และ Head ในการอนุมัติ
            setIsAdmin(adminRole);

            if (currentUser.wardId) {
                setFormData(prev => ({ ...prev, wardId: currentUser.wardId }));
            }
        }
        fetchMasterData();
        fetchRequests();
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
        try {
            const res = await axiosClient.get('/Request');
            setRequests(res.data.sort((a: any, b: any) => b.requestId - a.requestId));
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async () => {
        if (!user || !user.userId) return Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
        if (!formData.productId || !formData.quantity || !formData.wardId) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');

        const quantity = parseInt(formData.quantity);
        if (quantity <= 0) return Swal.fire('แจ้งเตือน', 'จำนวนการเบิกต้องมากกว่า 0', 'warning');

        if (currentStock !== null && quantity > currentStock) {
            return Swal.fire('ของไม่พอ!', `สินค้าชิ้นนี้เหลือเพียง ${currentStock} ชิ้น`, 'error');
        }

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
            requestItems: [{ productId, quantity: quantity, damageReasonId }]
        };

        try {
            await axiosClient.post('/Request', payload);

            Swal.fire({
                icon: 'success',
                title: 'ส่งคำร้องเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });

            const typeText = typeId === 1 ? 'เบิกผ้า' : 'เปลี่ยนผ้า';
            const productName = products.find(p => p.productId === productId)?.productName || 'สินค้า';

            await sendNotification(
                `มีคำร้อง${typeText}ใหม่`,
                `${user.firstName} ได้ขอ${typeText} ${productName} จำนวน ${quantity} ชิ้น`,
                'INFO',
                '/requests',
                undefined,
                1
            );

            setFormData(prev => ({ ...prev, quantity: '', damageReasonId: '' }));
            checkStock(productId);
            fetchRequests();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'ไม่สามารถส่งคำร้องได้';
            Swal.fire('Error', msg, 'error');
        }
    };

    const handleApprove = async (reqId: number, isApprove: boolean) => {
        const action = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
        Swal.fire({
            title: `ยืนยันการ${action}?`,
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const currentReq = requests.find(r => r.requestId === reqId);
                    if (currentReq) {
                        await axiosClient.put(`/Request/${reqId}`, {
                            requestId: reqId,
                            currentStatusId: isApprove ? 2 : 3,
                            requestType: currentReq.requestType,
                            requestedByUserId: currentReq.requestedByUserId,
                            targetWardId: currentReq.targetWardId,
                            requestCode: currentReq.requestCode
                        });

                        Swal.fire({
                            icon: 'success',
                            title: 'บันทึกสถานะเรียบร้อย',
                            timer: 1500,
                            showConfirmButton: false
                        });

                        const statusText = isApprove ? 'ได้รับการอนุมัติแล้ว' : 'ถูกปฏิเสธ';
                        const notiType = isApprove ? 'SUCCESS' : 'DANGER';

                        await sendNotification(
                            `คำร้อง ${currentReq.requestCode} ${action}แล้ว`,
                            `คำร้องของคุณ${statusText} โดย ${user.firstName}`,
                            notiType,
                            '/requests',
                            currentReq.requestedByUserId
                        );

                        fetchRequests();
                    }
                } catch (apiErr: any) {
                    Swal.fire('Error', 'ไม่สามารถบันทึกสถานะได้', 'error');
                }
            }
        });
    };

    const getStatusChip = (statusId: number) => {
        switch (statusId) {
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

            {/* 1. ส่วน Form */}
            <Card elevation={2} sx={{ mb: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Send color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                        สร้างคำร้องใหม่ (New Request)
                    </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
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

                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>วอร์ด/แผนก</InputLabel>
                                <Select
                                    value={formData.wardId}
                                    label="วอร์ด/แผนก"
                                    onChange={e => setFormData({ ...formData, wardId: e.target.value })}
                                >
                                    {wards.map((w) => <MenuItem key={w.wardId} value={w.wardId}>{w.wardName}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>หมวดผ้า</InputLabel>
                                <Select
                                    value={formData.categoryId}
                                    label="หมวดผ้า"
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <MenuItem value=""><em>ทั้งหมด</em></MenuItem>
                                    {categories.map((c) => <MenuItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel>รายการผ้า</InputLabel>
                                <Select value={formData.productId} label="รายการผ้า" onChange={e => setFormData({ ...formData, productId: e.target.value })}>
                                    {filteredProducts.map((p) => <MenuItem key={p.productId} value={p.productId}>{p.productName} ({p.sizeSpec})</MenuItem>)}
                                </Select>
                                {currentStock !== null && (
                                    <FormHelperText sx={{ color: currentStock > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                                        <Inventory2 fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                        คงเหลือที่เบิกได้: {currentStock} ชิ้น
                                    </FormHelperText>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="จำนวน (ชิ้น)"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                InputProps={{ inputProps: { min: 1, max: currentStock || 999 } }}
                                error={currentStock !== null && Number(formData.quantity) > currentStock}
                                helperText={currentStock !== null && Number(formData.quantity) > currentStock ? "เกินจำนวนที่มีในคลัง" : ""}
                            />
                        </Grid>

                        {requestType === '2' && (
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth error>
                                    <InputLabel>สาเหตุชำรุด</InputLabel>
                                    <Select
                                        value={formData.damageReasonId}
                                        label="สาเหตุชำรุด"
                                        onChange={e => setFormData({ ...formData, damageReasonId: e.target.value })}
                                    >
                                        {reasons.map((r) => <MenuItem key={r.reasonId} value={r.reasonId}>{r.reasonName}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                            <Button variant="outlined" size="large" onClick={() => setFormData({ ...formData, quantity: '', productId: '' })}>ล้างข้อมูล</Button>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleSubmit}
                                startIcon={requestType === '1' ? <AddCircle /> : <Autorenew />}
                                sx={{ px: 5 }}
                                disabled={currentStock !== null && (currentStock === 0 || Number(formData.quantity) > currentStock)}
                            >
                                {requestType === '1' ? 'ส่งคำร้องเบิก' : 'ส่งคำร้องเปลี่ยน'}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* 2. ส่วน Table */}
            <Card elevation={2} sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ListAlt color="action" />
                        <Typography variant="subtitle1" fontWeight="bold" color="textSecondary">
                            {isAdmin ? 'รายการรออนุมัติ / ประวัติทั้งหมด' : 'ประวัติคำร้องของฉัน'}
                        </Typography>
                        <Chip label={`${requests.length} รายการ`} size="small" color="default" />
                    </Box>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>เลขที่ / วันที่</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>ผู้เบิก / แผนก</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>รายการสินค้า</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%' }}>สถานะ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', width: '15%' }}>จัดการ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#94a3b8' }}>ไม่พบข้อมูลคำร้อง</TableCell></TableRow>
                            ) : requests.map((req) => {
                                return (
                                    <TableRow key={req.requestId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                                {req.requestCode}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {new Date(req.createdAt || Date.now()).toLocaleDateString('th-TH')}
                                                <br />
                                                {new Date(req.createdAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">
                                                {req.targetWard?.wardName || '-'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                ผู้เบิก: {req.requestedByUser?.firstName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {req.requestItems?.map((item: any, idx: number) => (
                                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: idx !== req.requestItems.length - 1 ? '1px dashed #eee' : 'none' }}>
                                                    <Box sx={{ minWidth: 60, textAlign: 'center', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
                                                        <Typography variant="h6" color="primary" fontWeight="bold" sx={{ lineHeight: 1 }}>
                                                            {item.quantity || 0}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                                            ชิ้น
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="500">
                                                            {item.product?.productName} <span style={{ color: '#64748b', fontSize: '0.85em' }}>({item.product?.sizeSpec})</span>
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
                                                {isAdmin && req.currentStatusId === 1 ? (
                                                    <>
                                                        <Tooltip title="อนุมัติ">
                                                            <IconButton
                                                                size="small"
                                                                sx={{ color: '#10b981', bgcolor: '#ecfdf5', border: '1px solid #10b981', '&:hover': { bgcolor: '#d1fae5' } }}
                                                                onClick={() => handleApprove(req.requestId, true)}
                                                            >
                                                                <CheckCircle fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="ปฏิเสธ">
                                                            <IconButton
                                                                size="small"
                                                                sx={{ color: '#f59e0b', bgcolor: '#fffbeb', border: '1px solid #f59e0b', '&:hover': { bgcolor: '#fef3c7' } }}
                                                                onClick={() => handleApprove(req.requestId, false)}
                                                            >
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
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default Requests;