import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, CircularProgress, Button, Stack, useTheme, alpha, TablePagination
} from '@mui/material';
import {
    LocalShipping, History, Refresh, Place
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';

/**
 * โครงสร้างข้อมูลรายการติดตามสถานะการขนส่งผ้า
 * @interface TransportMonitorItem
 */
interface TransportMonitorItem {
    rfid: string;
    productName: string;
    location: string;
    status: string;
    updatedAt: string;
}

/**
 * หน้าจอติดตามสถานะการขนส่ง (Transport Monitor)
 * 
 * @returns {JSX.Element} คอมโพเนนต์หน้าจอติดตามสถานะ
 */
const Transport: React.FC = () => {
    const theme = useTheme();

    // ตรวจสอบสิทธิ์การเข้าใช้งานอย่างละเอียด
    const userStr = localStorage.getItem('currentUser');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const permissions = currentUser?.permissions || currentUser?.Permissions || [];
    const roleId = currentUser?.roleId || currentUser?.RoleId || 0;

    // ตรวจสอบสิทธิ์สำหรับการจัดการ (หากไม่มีสิทธิ์จะสามารถดูตารางได้เพียงอย่างเดียว)
    const canManage = roleId === 1 || permissions.includes('MANAGE_TRANSPORT');

    const [transportList, setTransportList] = useState<TransportMonitorItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    useEffect(() => {
        fetchTransportList();
        const interval = setInterval(() => {
            fetchTransportList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchTransportList = async () => {
        try {
            const res = await axiosClient.get('/Linen/Monitor/Latest');
            const data = res.data || [];

            const filtered = data.filter((item: any) =>
                item.status === 'กำลังส่ง' ||
                item.status === 'ระหว่างขนส่ง' ||
                item.status === 'Dispatch' ||
                item.location === 'ระหว่างขนส่ง'
            );

            const mappedData: TransportMonitorItem[] = filtered.map((item: any) => ({
                rfid: item.RfidCode || item.rfidCode || item.rfid || '-',
                productName: item.ItemName || item.productName || item.product_name || '-',
                location: item.CurrentLocation || item.currentLocation || item.location || '-',
                status: item.Status || item.status || '-',
                updatedAt: item.UpdatedAt || item.updatedAt || item.registeredAt
            }));

            setTransportList(mappedData);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching transport list:", err);
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'กำลังส่ง' || s === 'ระหว่างขนส่ง' || s === 'dispatch') return 'warning';
        return 'default';
    };

    return (
        <Box sx={{ pb: 5, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden' }}>
            <PageHeader
                title="ติดตามสถานะขนส่ง (Transport Monitor)"
                subtitle="ตรวจสอบรายการผ้าที่อยู่ระหว่างการขนส่งไปยังวอร์ดหรือโรงซักแบบเรียลไทม์"
                icon={<LocalShipping fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'ติดตามขนส่ง' }
                ]}
            />

            <Box sx={{ flexGrow: 1, p: 3, pt: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                        <Box sx={{ p: 2, px: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" alignItems="center" gap={1.5}>
                                <History color="warning" />
                                <Typography variant="h6" fontWeight="bold" color="warning.dark">รายการผ้ากำลังขนส่ง (In Transit List)</Typography>
                                <Chip label={`${transportList.length} รายการ`} size="small" color="warning" sx={{ fontWeight: 'bold', ml: 1 }} />
                            </Stack>

                            {/* ซ่อนปุ่มอัปเดต ถ้าไม่ได้รับสิทธิ์สำหรับการจัดการ (Manage) */}
                            {canManage && (
                                <Button startIcon={<Refresh />} size="small" variant="outlined" color="warning" onClick={() => { setLoading(true); fetchTransportList(); }}>
                                    อัปเดตข้อมูล
                                </Button>
                            )}
                        </Box>

                        <TableContainer sx={{ flexGrow: 1 }}>
                            <Table size="medium">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>RFID Code</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '30%' }}>ชื่อสินค้า</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '20%' }}>ตำแหน่งล่าสุด</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '15%' }}>เวลาทำรายการ</TableCell>
                                        <TableCell sx={{ fontWeight: '700', bgcolor: '#f8fafc', width: '15%' }} align="center">สถานะ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                                    ) : transportList.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>ไม่พบรายการผ้าที่กำลังขนส่ง</TableCell></TableRow>
                                    ) : (
                                        transportList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, index) => (
                                            <TableRow key={`${item.rfid}-${index}`} hover sx={{ '& td': { py: 1.5 } }}>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                                                    {item.rfid}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>
                                                    {item.productName}
                                                </TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>
                                                    {item.location !== '-' ? (
                                                        <Chip icon={<Place style={{ fontSize: 14 }} />} label={item.location} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem', borderColor: '#e2e8f0' }} />
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
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={transportList.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />

                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Transport;