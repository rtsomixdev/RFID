import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, CircularProgress, Button, Stack, useTheme, alpha
} from '@mui/material';
import {
    LocalLaundryService, History, Refresh, Room
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';

interface WashingItem {
    rfid: string;
    productName: string;
    location: string;
    status: string;
    updatedAt: string;
}

const Laundry: React.FC = () => {
    const theme = useTheme();

    // ✅ การเช็คสิทธิ์แบบละเอียด
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const permissions = currentUser?.permissions || currentUser?.Permissions || [];
    const roleId = currentUser?.roleId || currentUser?.RoleId || 0;
    
    // เช็คว่ามีสิทธิ์จัดการกระบวนการซักรีดหรือไม่
    const canManage = roleId === 1 || permissions.includes('MANAGE_LAUNDRY');
    
    const [washingList, setWashingList] = useState<WashingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWashingList();
        const interval = setInterval(() => {
            fetchWashingList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchWashingList = async () => {
        try {
            const res = await axiosClient.get('/Linen/Monitor/Latest');
            const data = res.data || [];

            const filtered = data.filter((item: any) => 
                item.status === 'กำลังซัก' || 
                item.status === 'ส่งซัก' ||
                item.status === 'Washing' ||
                item.location === 'โรงซัก' ||
                item.location === 'จุดพักผ้ารอซัก'
            );

            const mappedData: WashingItem[] = filtered.map((item: any) => ({
                rfid: item.RfidCode || item.rfidCode || item.rfid || '-',
                productName: item.ItemName || item.productName || item.product_name || '-',
                location: item.CurrentLocation || item.currentLocation || item.location || '-',
                status: item.Status || item.status || '-',
                updatedAt: item.UpdatedAt || item.updatedAt || item.registeredAt
            }));

            setWashingList(mappedData);
            setLoading(false);
        } catch (err) { 
            console.error("Fetch Washing Error: ", err); 
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'กำลังซัก' || s === 'washing') return 'info';
        if (s === 'ส่งซัก' || s === 'sendingtolaundry') return 'warning';
        return 'default';
    };

    return (
        <Box sx={{ pb: 5, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden' }}>
            <PageHeader
                title="ติดตามสถานะซักรีด (Laundry Monitor)"
                subtitle="ตรวจสอบรายการผ้าที่กำลังส่งซักและอยู่ระหว่างการซักแบบเรียลไทม์"
                icon={<LocalLaundryService fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ติดตามซักรีด' }
                ]}
            />

            <Box sx={{ flexGrow: 1, p: 3, pt: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        
                        <Box sx={{ p: 2, px: 3, bgcolor: alpha(theme.palette.info.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" alignItems="center" gap={1.5}>
                                <History color="info" />
                                <Typography variant="h6" fontWeight="bold" color="info.main">รายการผ้ากำลังซัก (Washing List)</Typography>
                                <Chip label={`${washingList.length} รายการ`} size="small" color="info" sx={{ fontWeight: 'bold', ml: 1 }} />
                            </Stack>
                            
                            {/* ซ่อนปุ่มอัปเดต/จัดการ ถ้ายูสเซอร์ไม่มีสิทธิ์ Manage (ให้ข้อมูลอัปเดตอัตโนมัติก็พอ) */}
                            {canManage && (
                                <Button startIcon={<Refresh />} size="small" variant="outlined" color="info" onClick={() => { setLoading(true); fetchWashingList(); }}>
                                    อัปเดตข้อมูล
                                </Button>
                            )}
                        </Box>

                        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Table stickyHeader size="medium">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>RFID Code</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '30%' }}>ชื่อสินค้า</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>สถานที่ล่าสุด</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '15%' }}>เวลาทำรายการ</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '15%' }} align="center">สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                                    ) : washingList.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>ไม่พบรายการผ้าที่กำลังดำเนินการซัก</TableCell></TableRow>
                                    ) : (
                                        washingList.map((item, index) => (
                                            <TableRow key={`${item.rfid}-${index}`} hover sx={{ '& td': { py: 1.5 } }}>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                                                    {item.rfid}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>
                                                    {item.productName}
                                                </TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>
                                                    {item.location !== '-' ? (
                                                        <Chip icon={<Room style={{ fontSize: 14 }} />} label={item.location} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem', borderColor: '#e2e8f0' }} />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.9rem' }}>
                                                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString('th-TH') : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={item.status} color={getStatusColor(item.status) as any} size="small" variant="filled" sx={{ fontWeight: 600, minWidth: 90 }} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Laundry;