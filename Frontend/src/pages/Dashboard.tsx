import React, { useEffect, useState } from 'react';
import {
    Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Stack, Avatar, Container, useTheme, alpha,
    List, ListItem, Divider, Chip
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Inventory, ShoppingCart, Warning, CheckCircle, TrendingUp, Assessment, DonutLarge, InsertChartOutlined, NewReleases, LocalLaundryService, Room
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';

// --- Theme Colors ---
const CHART_COLORS = {
    purple: '#8b5cf6',
    new: '#0ea5e9',
    teal: '#14b8a6',
    pink: '#ec4899'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

// --- Interfaces ---
interface DashboardStats {
    totalLinen: number;
    newLinenToday: number;
    washing: number;
    available: number;
    pendingRequests: number;
    damaged: number;
    disposed: number;
}

const Dashboard: React.FC = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);

    // --- STATE ---
    const [stats, setStats] = useState<DashboardStats>({
        totalLinen: 0, newLinenToday: 0, washing: 0, available: 0,
        pendingRequests: 0, damaged: 0, disposed: 0
    });

    const [pieData, setPieData] = useState<any[]>([]);
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [requestData, setRequestData] = useState<any[]>([]);
    const [damagedData, setDamagedData] = useState<any[]>([]);
    const [yearlyData, setYearlyData] = useState<any[]>([]);
    
    // สเตทใหม่ สำหรับเก็บข้อมูล Stock แยกตามสถานที่
    const [locationStock, setLocationStock] = useState<Record<string, Record<string, number>>>({});

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); 
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        // 🔥 1. ดึงข้อมูลกราฟและสถิติเดิม (แยกไว้ ไม่ให้กระทบกัน)
        try {
            const [statRes, chartRes] = await Promise.all([
                axiosClient.get('/Dashboard/Stats'),
                axiosClient.get('/Dashboard/ChartData')
            ]);

            setStats(statRes.data);

            const data = chartRes.data || {};
            setPieData(data.pieData || []);
            setDailyData(data.dailyData || []);
            setRequestData(data.requestData || []);
            setDamagedData(data.damagedData || []);
            setYearlyData(data.yearlyData || []);
        } catch (error) {
            console.error("Dashboard Charts Fetch Error:", error);
        }

        // 🔥 2. ดึงข้อมูลสถานที่แยกต่างหาก (ถึง Error กราฟด้านบนก็จะไม่หาย)
        try {
            const linenRes = await axiosClient.get('/Linen');
            const allLinens = linenRes.data?.data || linenRes.data || []; 
            const groupedStock: Record<string, Record<string, number>> = {};

            allLinens.forEach((item: any) => {
                const status = (item.status || '').toLowerCase();
                // ข้ามผ้าที่ชำรุดหรือจำหน่ายออก
                if (status.includes('discard') || status.includes('จำหน่าย') || status.includes('alien') || status.includes('ชำรุด')) return;

                const loc = item.currentLocation || item.CurrentLocation || 'ไม่ระบุสถานที่';
                const prodName = item.product?.productName || item.ItemName || item.productName || 'ไม่ระบุชื่อผ้า';

                if (!groupedStock[loc]) groupedStock[loc] = {};
                if (!groupedStock[loc][prodName]) groupedStock[loc][prodName] = 0;
                
                groupedStock[loc][prodName]++; 
            });

            setLocationStock(groupedStock);
        } catch (error) {
            console.error("Dashboard Location Stock Fetch Error:", error);
        } finally {
            setLoading(false); // ปิด Loading เมื่อทำเสร็จทั้ง 2 ส่วน
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 2 }}>
                <CircularProgress size={48} thickness={4} />
                <Typography color="textSecondary" variant="body2">กำลังโหลดข้อมูล...</Typography>
            </Box>
        );
    }

    // --- COMPONENTS ---
    const StatCard = ({ title, value, icon, color, subtitle }: any) => (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 10px 20px -5px ${alpha(color, 0.15)}`,
                    borderColor: alpha(color, 0.3)
                }
            }}
        >
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0, flex: 1, mr: 2 }}>
                        <Typography variant="subtitle2" fontWeight="600" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="800" sx={{ color: theme.palette.text.primary, letterSpacing: -1 }}>
                            {value?.toLocaleString() || 0}
                        </Typography>
                        {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
                    </Box>
                    <Avatar
                        variant="rounded"
                        sx={{
                            bgcolor: alpha(color, 0.1),
                            color: color,
                            width: 56, height: 56,
                            borderRadius: '12px'
                        }}
                    >
                        {React.cloneElement(icon, { fontSize: 'medium' })}
                    </Avatar>
                </Stack>
            </CardContent>
        </Card>
    );

    const ChartContainer = ({ title, subtitle, icon, children, height = 400 }: any) => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                minHeight: height,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fff',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <Box sx={{ color: theme.palette.primary.main, display: 'flex', p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '10px' }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight="700" color="text.primary" lineHeight={1.2}>
                        {title}
                    </Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary" fontWeight={500}>{subtitle}</Typography>}
                </Box>
            </Stack>
            <Box sx={{ flexGrow: 1, position: 'relative', width: '100%', minHeight: 250 }}>
                {children}
            </Box>
        </Paper>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Paper
                    elevation={3}
                    sx={{
                        p: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '12px',
                        bgcolor: 'rgba(255, 255, 255, 0.95)'
                    }}
                >
                    <Typography variant="subtitle2" fontWeight="bold" color="textPrimary" sx={{ mb: 1 }}>{label}</Typography>
                    {payload.map((entry: any, index: number) => (
                        <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color || entry.payload.fill }} />
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.85rem' }}>
                                {entry.name}: <span style={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{entry.value.toLocaleString()}</span>
                            </Typography>
                        </Stack>
                    ))}
                </Paper>
            );
        }
        return null;
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="สถิติภาพรวม (Dashboard)"
                subtitle="ติดตามสถานะผ้าและวิเคราะห์ข้อมูลการใช้งานเรียลไทม์"
                icon={<Assessment fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'Dashboard' }
                ]}
            />

            <Container maxWidth={false} disableGutters>
                {/* SECTION 1: KPI Cards */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ width: 4, height: 24, bgcolor: theme.palette.secondary.main, borderRadius: 1 }} />
                        สรุปสถานะปัจจุบัน
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="ผ้าใหม่วันนี้" value={stats.newLinenToday} icon={<NewReleases />} color={CHART_COLORS.new} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinen} icon={<Inventory />} color={theme.palette.primary.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="กำลังส่งซัก" value={stats.washing} icon={<LocalLaundryService />} color={theme.palette.warning.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="พร้อมใช้งาน" value={stats.available} icon={<CheckCircle />} color={theme.palette.success.main} />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart />} color={CHART_COLORS.purple} />
                        </Grid>
                        
                        {/* ✅ แก้ไขตรงนี้ ไม่ให้ค่าบวกกันเบิ้ล ดึงแค่ stats.disposed ที่มาจากหลังบ้านก็พอครับ */}
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="แจ้งชำรุด/หาย" value={stats.disposed || 0} icon={<Warning />} color={theme.palette.error.main} />
                        </Grid>
                    </Grid>
                </Box>

                {/* SECTION 2: Charts */}
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ width: 4, height: 24, bgcolor: theme.palette.secondary.main, borderRadius: 1 }} />
                        การวิเคราะห์เชิงลึก
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} lg={8}>
                            <ChartContainer title="การเคลื่อนไหวของผ้า (7 วันล่าสุด)" subtitle="เปรียบเทียบยอดเบิกใช้ vs ส่งซัก" icon={<Assessment fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
                                        <Bar dataKey="use" name="เบิกใช้" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} barSize={24} />
                                        <Bar dataKey="wash" name="ส่งซัก" fill={theme.palette.info.main} radius={[4, 4, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        <Grid item xs={12} lg={4}>
                            <ChartContainer title="สัดส่วนประเภทผ้า" subtitle="จำแนกตามชนิดสินค้า Top 5" icon={<DonutLarge fontSize="small" />}>
                                <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ flex: 1, minHeight: 200, position: 'relative' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                            <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ lineHeight: 1 }}>
                                                {pieData.reduce((a, b) => a + b.value, 0).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">Total</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mt: 2, maxHeight: 150, overflowY: 'auto', pr: 1 }}>
                                        {pieData.map((entry, index) => (
                                            <Stack key={index} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, p: 0.5, borderRadius: 1, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 140, fontSize: '0.85rem', fontWeight: 500, color: theme.palette.text.secondary }}>
                                                        {entry.name}
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="body2" fontWeight="bold" color="text.primary">
                                                    {entry.value.toLocaleString()}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Box>
                                </Box>
                            </ChartContainer>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ChartContainer title="สถิติคำร้องรายเดือน" subtitle="ปริมาณคำร้องเบิกผ้าตลอดปี" icon={<InsertChartOutlined fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={requestData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" name="คำร้อง" fill={CHART_COLORS.purple} radius={[4, 4, 4, 4]} barSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ChartContainer title="แนวโน้มผ้าชำรุด" subtitle="สถิติการแจ้งชำรุดรายเดือน" icon={<Warning sx={{ color: theme.palette.error.main }} fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={damagedData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDamaged" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" name="ชำรุด" stroke={theme.palette.error.main} strokeWidth={2} fillOpacity={1} fill="url(#colorDamaged)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        <Grid item xs={12}>
                            <ChartContainer title="ภาพรวมการหมุนเวียนตลอดปี" subtitle="ปริมาณธุรกรรมทั้งหมด (Transaction Volume)" icon={<TrendingUp fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={yearlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="value" name="จำนวนธุรกรรม" stroke={theme.palette.primary.main} strokeWidth={3} fill="url(#colorValue)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>
                    </Grid>
                </Box>

                {/* ✅ SECTION 3: ยอดคงเหลือจำแนกตามสถานที่ (Stock by Location) */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ width: 4, height: 24, bgcolor: theme.palette.success.main, borderRadius: 1 }} />
                        ยอดผ้าคงเหลือจำแนกตามสถานที่ (Stock by Location)
                    </Typography>
                    
                    <Grid container spacing={3}>
                        {Object.keys(locationStock).length === 0 ? (
                            <Grid item xs={12}>
                                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 3, border: `1px dashed ${theme.palette.divider}` }}>
                                    <Inventory sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                                    <Typography>ไม่พบข้อมูลสถานที่ที่มีผ้าค้างอยู่</Typography>
                                </Paper>
                            </Grid>
                        ) : (
                            Object.entries(locationStock).map(([location, items]) => (
                                <Grid item xs={12} sm={6} lg={4} key={location}>
                                    <Card 
                                        elevation={0} 
                                        sx={{ 
                                            height: '100%', 
                                            borderRadius: 3, 
                                            border: `1px solid ${theme.palette.divider}`, 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                boxShadow: `0 4px 20px 0px ${alpha(theme.palette.success.main, 0.15)}`,
                                                borderColor: alpha(theme.palette.success.main, 0.3)
                                            }
                                        }}
                                    >
                                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Room color="success" />
                                            <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                                                {location}
                                            </Typography>
                                        </Box>
                                        <CardContent sx={{ flexGrow: 1, p: 0, '&:last-child': { pb: 0 } }}>
                                            <List sx={{ width: '100%', p: 0 }}>
                                                {Object.entries(items).map(([itemName, qty], idx) => (
                                                    <React.Fragment key={itemName}>
                                                        <ListItem sx={{ py: 1.5, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                                {itemName}
                                                            </Typography>
                                                            <Chip 
                                                                label={`${qty} ชิ้น`} 
                                                                size="small" 
                                                                sx={{ 
                                                                    fontWeight: 'bold', 
                                                                    bgcolor: alpha(theme.palette.success.main, 0.1), 
                                                                    color: 'success.dark',
                                                                    minWidth: '60px'
                                                                }} 
                                                            />
                                                        </ListItem>
                                                        {idx < Object.keys(items).length - 1 && <Divider component="li" />}
                                                    </React.Fragment>
                                                ))}
                                            </List>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))
                        )}
                    </Grid>
                </Box>
                {/* จบ SECTION 3 */}

            </Container>
        </Box>
    );
};

export default Dashboard;