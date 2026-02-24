import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, CircularProgress, Button, Stack, useTheme, alpha
} from '@mui/material';
import {
    LocalShipping, History, Refresh, Room, Place
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';

// --- Interfaces ---
interface TransportMonitorItem {
    rfid: string;
    productName: string;
    location: string;
    status: string;
    updatedAt: string;
}

const Transport: React.FC = () => {
    const theme = useTheme();
    
    // Transport List States
    const [transportList, setTransportList] = useState<TransportMonitorItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransportList();

        // Auto Refresh ทุก 5 วินาที
        const interval = setInterval(() => {
            fetchTransportList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // ✅ ฟังก์ชันดึงข้อมูลตาราง (ดึงจาก Linen Monitor เหมือนหน้า Home แต่เอามา Filter)
    const fetchTransportList = async () => {
        try {
            const res = await axiosClient.get('/Linen/Monitor/Latest');
            const data = res.data || [];

            // กรองเอาเฉพาะสถานะ "กำลังส่ง" หรือ "ระหว่างขนส่ง"
            const filtered = data.filter((item: any) =>
                item.status === 'กำลังส่ง' ||
                item.status === 'ระหว่างขนส่ง' ||
                item.status === 'Dispatch' ||
                item.location === 'ระหว่างขนส่ง'
            );

            // Map ให้ตรง Interface
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
                            <Button startIcon={<Refresh />} size="small" variant="outlined" color="warning" onClick={() => { setLoading(true); fetchTransportList(); }}>
                                อัปเดตข้อมูล
                            </Button>
                        </Box>

                        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Table stickyHeader size="medium">
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
                                        transportList.map((item, index) => (
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

                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Transport;