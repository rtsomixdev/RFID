import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, CircularProgress, Button, useTheme, alpha, IconButton, TablePagination
} from '@mui/material';
import {
    WifiTethering, LocationOn, CheckCircle, Login, Dashboard as DashboardIcon,
    Warning, Room, Refresh, SignalWifiOff
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

/**
 * โครงสร้างข้อมูลแสดงสถานะและประวัติการเคลื่อนไหว
 * @interface MonitorItem
 */
interface MonitorItem {
    rfid: string;
    productName: string;
    location: string;
    status: string;
    timestamp: string;
}

/**
 * ฟังก์ชันปรับรูปแบบวันที่และเวลาให้เป็นภาษาไทย
 * 
 * @param {string | undefined | null} dateString ข้อความวันที่ที่ต้องการจัดรูปแบบ
 * @returns {string} วันที่และเวลาในรูปแบบที่อ่านง่าย หรือเครื่องหมาย '-' หากไม่มีข้อมูล
 */
const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
        return '-';
    }
};

/**
 * หน้าจอหลัก แสดงสถานะและการเคลื่อนไหวแบบเรียลไทม์
 * 
 * @returns {JSX.Element} คอมโพเนนต์หน้าจอหลัก (Monitor)
 */
const Home: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [registeredItems, setRegisteredItems] = useState<MonitorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [allItemsCount, setAllItemsCount] = useState(0);

    // สถานะสำหรับการเชื่อมต่อกับเครื่องอ่าน RFID
    const [isReaderOnline, setIsReaderOnline] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    const [activeReaderCount, setActiveReaderCount] = useState(0);

    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000); // Poll every 2 seconds

        // ดักจับเหตุการณ์การสแกน RFID แบบเรียลไทม์ผ่าน SignalR
        const handleRealtimeScan = (e: any) => {
            const data = e.detail;
            console.log("⚡ Home Real-time Scan:", data);

            // ตรวจจับและสร้างโครงสร้างข้อมูลใหม่จากสัญญาณแบบเรียลไทม์
            const newItem: MonitorItem = {
                rfid: data.rfid || 'Unknown',
                productName: data.productName || (data.status === 'ไม่พบในระบบ' ? 'ไม่พบในระบบ' : 'Unknown Item'),
                location: data.reader || data.location || '-',
                status: data.status || 'Unknown',
                timestamp: new Date().toISOString()
            };

            // อัปเดตข้อมูลตารางโดยแสดงรายการล่าสุดไว้บนสุด (จำกัด 50 แถว)
            setRegisteredItems(prev => {
                const filtered = prev.filter(item => item.rfid !== newItem.rfid);
                return [newItem, ...filtered].slice(0, 50);
            });
            setAllItemsCount(prev => prev + 1);
        };

        window.addEventListener("RFID_SCANNED", handleRealtimeScan);

        return () => {
            clearInterval(interval);
            window.removeEventListener("RFID_SCANNED", handleRealtimeScan);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            // ขั้นตอนที่ 1: ร้องขอข้อมูลประวัติการสแกนล่าสุด
            const resMonitor = await axiosClient.get('/Linen/Monitor/Latest');
            const rawData = resMonitor.data || [];

            // ขั้นตอนที่ 2: ตรวจสอบสถานะและจำนวนเครื่องอ่าน RFID ที่ออนไลน์
            try {
                const resReaders = await axiosClient.get('/Reader');
                const readers = resReaders.data || [];
                const onlineCount = readers.filter((r: any) => r.isActive).length;
                setActiveReaderCount(onlineCount);
                setIsReaderOnline(onlineCount > 0);
            } catch (readerErr) {
                console.error("Reader Fetch Error", readerErr);
                setIsReaderOnline(false);
            }

            // ขั้นตอนที่ 3: จัดเตรียมและปรับโครงสร้างข้อมูลเพื่อนำขึ้นแสดงผล
            const mappedData: MonitorItem[] = rawData.map((item: any) => {
                const loc = item.CurrentLocation || item.currentLocation || item.current_location || item.location || item.readerLocation;
                const time = item.UpdatedAt || item.updatedAt || item.updated_at ||
                    item.RegisteredAt || item.registeredAt || item.registered_at;

                return {
                    rfid: item.RfidCode || item.rfidCode || item.rfid || 'Unknown ID',
                    productName: item.ItemName || item.productName || item.product_name || item.item_name || 'Unknown Item',
                    location: loc || '-',
                    status: item.Status || item.status || 'Unknown',
                    timestamp: time
                };
            });

            // บันทึกข้อมูลทั้งหมดลงในสถานะตารางแสดงผลภาพรวม
            setRegisteredItems(mappedData);
            setAllItemsCount(rawData.length);

            setLoading(false);
        } catch (err) {
            console.error("Fetch Error:", err);
            setLoading(false);
            setIsReaderOnline(false);
        }
    };

    // ตรวจสอบและระบุพิกัดล่าสุดของรายการผ้า
    const latestItem = registeredItems.length > 0 ? registeredItems[0] : null;
    const latestLocation = latestItem && latestItem.location !== '-' ? latestItem.location : "Waiting...";

    const getStatusColor = (status: string) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'available' || s === 'normal' || s === 'พร้อมใช้') return 'success';
        if (s.includes('damage') || s === 'disposed' || s === 'lost' || s === 'alien' || s === 'จำหน่ายแล้ว' || s === 'จำหน่ายออก' || s === 'ชำรุด' || s.includes('ไม่พบ')) return 'error';
        if (s === 'in use' || s === 'borrowed' || s === 'ถูกใช้งาน') return 'primary';
        if (s === 'washing' || s === 'laundry' || s === 'กำลังซัก' || s === 'ส่งซัก') return 'info';
        if (s === 'dispatch' || s === 'กำลังส่ง' || s === 'ระหว่างขนส่ง') return 'warning';
        return 'default';
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f8fafc',
            overflow: 'hidden'
        }}>

            {/* ส่วนหัวกระดาษและสรุปสถิติ */}
            <Box sx={{ p: 3, pb: 1, flexShrink: 0, bgcolor: 'white', borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DashboardIcon color="primary" /> หน้าหลัก (Monitor)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">ระบบติดตามผ้าแบบเรียลไทม์ (Real-time Tracking)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {!user && (
                            <Button variant="contained" size="medium" startIcon={<Login />} onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
                        )}
                    </Box>
                </Box>

                {/* การ์ดสรุปสถิติภาพรวม */}
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>

                    {/* ข้อมูลที่ 1: สถานะออนไลน์ของเครื่องอ่าน RFID */}
                    <Card elevation={0} sx={{ flex: 1, bgcolor: '#1e293b', color: '#fff', border: 'none', borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1 }}>READER STATUS</Typography>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: isReaderOnline ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    {isReaderOnline ? <WifiTethering /> : <SignalWifiOff />}
                                    {isReaderOnline ? "ONLINE" : "OFFLINE"}
                                </Typography>
                                {isReaderOnline && (
                                    <Typography variant="caption" sx={{ color: '#4ade80', opacity: 0.8 }}>
                                        {activeReaderCount} device(s) active
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: isReaderOnline ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)' }}>
                                {isReaderOnline ? <CheckCircle sx={{ fontSize: 32, color: '#4ade80' }} /> : <Warning sx={{ fontSize: 32, color: '#f87171' }} />}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ข้อมูลที่ 2: ตำแหน่งพิกัดที่มีการสแกนล่าสุด */}
                    <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>LATEST LOCATION</Typography>
                                <Typography variant="h5" fontWeight="bold" color="text.primary" noWrap sx={{ maxWidth: 300, mt: 0.5 }}>{latestLocation}</Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                <LocationOn sx={{ fontSize: 32, color: 'primary.main' }} />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ข้อมูลที่ 3: ยอดรวมจำนวนการสแกนของวันนี้ */}
                    <Card elevation={0} sx={{ flex: 1, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${theme.palette.info.light}`, borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" color="info.main" fontWeight="bold" sx={{ letterSpacing: 1 }}>TOTAL SCAN TODAY</Typography>
                                <Typography variant="h5" fontWeight="bold" color="info.dark" sx={{ mt: 0.5 }}>{allItemsCount} Items</Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: alpha(theme.palette.info.main, 0.2) }}>
                                <DashboardIcon sx={{ fontSize: 32, color: 'info.main' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* พื้นที่หลักสำหรับตารางประวัติการสแกน */}
            <Box sx={{
                flexGrow: 1,
                p: 3,
                pt: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0
            }}>
                {/* ตารางแสดงผลลัพธ์การสแกนแบบสด */}
                <Paper elevation={0} sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                }}>
                    <Box sx={{ p: 2, px: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CheckCircle color="primary" />
                            <Typography variant="h6" fontWeight="bold" color="primary.main">Live Scan Results</Typography>
                        </Box>
                        <Chip label={`${registeredItems.length} items`} color="primary" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <TableContainer>
                        <Table size="medium">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: '700', color: 'text.secondary', bgcolor: '#f8fafc' }}>TIME</TableCell>
                                    <TableCell sx={{ fontWeight: '700', color: 'text.secondary', bgcolor: '#f8fafc' }}>RFID</TableCell>
                                    <TableCell sx={{ fontWeight: '700', color: 'text.secondary', bgcolor: '#f8fafc' }}>ITEM NAME</TableCell>
                                    <TableCell sx={{ fontWeight: '700', color: 'text.secondary', bgcolor: '#f8fafc' }}>LOCATION</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: '700', color: 'text.secondary', bgcolor: '#f8fafc' }}>STATUS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={30} /></TableCell></TableRow>
                                ) : registeredItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary' }}>Waiting for scan...</TableCell></TableRow>
                                ) : (
                                    registeredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
                                        <TableRow key={index} hover sx={{ '& td': { py: 1.5, fontSize: '0.95rem' } }}>
                                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{formatDate(row.timestamp)}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>{row.rfid}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{row.productName}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>
                                                {row.location !== '-' && row.location ? (
                                                    <Chip icon={<Room style={{ fontSize: 16 }} />} label={row.location} size="small" variant="outlined" sx={{ height: 26, fontSize: '0.8rem', borderColor: '#e2e8f0' }} />
                                                ) : <Typography variant="caption" color="text.secondary">-</Typography>}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={row.status} size="small" color={getStatusColor(row.status) as any} sx={{ fontWeight: 600, minWidth: 90 }} variant="filled" />
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
                        count={registeredItems.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
            </Box>

            <style>{`
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </Box>
    );
};

export default Home;