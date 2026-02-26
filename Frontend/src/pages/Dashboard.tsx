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
    pink: '#ec4899',
    blue: '#3b82f6',
    orange: '#f59e0b'
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

        try {
            const linenRes = await axiosClient.get('/Linen');
            const allLinens = linenRes.data?.data || linenRes.data || [];
            const groupedStock: Record<string, Record<string, number>> = {};

            allLinens.forEach((item: any) => {
                const status = (item.status || '').toLowerCase();
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
            setLoading(false);
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
                borderTop: `4px solid ${color}`, // เพิ่มเส้นขอบบนให้ดูโดดเด่น
                bgcolor: '#ffffff',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 24px -8px ${alpha(color, 0.3)}`,
                    borderColor: alpha(color, 0.5)
                }
            }}
        >
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0, flex: 1, mr: 2 }}>
                        <Typography variant="subtitle2" fontWeight="700" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="800" sx={{ color: theme.palette.text.primary, letterSpacing: -1 }}>
                            {value?.toLocaleString() || 0}
                        </Typography>
                        {subtitle && <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>}
                    </Box>
                    <Avatar
                        variant="rounded"
                        sx={{
                            bgcolor: alpha(color, 0.1),
                            color: color,
                            width: 56, height: 56,
                            borderRadius: '14px',
                            boxShadow: `inset 0 0 0 1px ${alpha(color, 0.2)}`
                        }}
                    >
                        {React.cloneElement(icon, { fontSize: 'medium' })}
                    </Avatar>
                </Stack>
            </CardContent>
        </Card>
    );

    const ChartContainer = ({ title, subtitle, icon, children, height = 360 }: any) => (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 3 },
                height: '100%',
                minHeight: height,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
                borderRadius: '20px',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.02)}`
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <Box sx={{ color: theme.palette.primary.main, display: 'flex', p: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '12px' }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight="800" color="text.primary" lineHeight={1.2}>
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

    // ปรับ Tooltip ให้เป็นแบบ Glassmorphism สวยงาม
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Paper
                    elevation={4}
                    sx={{
                        p: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '12px',
                        bgcolor: alpha('#ffffff', 0.9),
                        backdropFilter: 'blur(8px)',
                        minWidth: 150
                    }}
                >
                    <Typography variant="subtitle2" fontWeight="800" color="textPrimary" sx={{ mb: 1, borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5 }}>
                        {label}
                    </Typography>
                    {payload.map((entry: any, index: number) => (
                        <Stack key={index} direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color || entry.payload.fill }} />
                                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                                    {entry.name}
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                                {entry.value.toLocaleString()}
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
                {/* ========================================================= */}
                {/* SECTION 1: KPI Cards */}
                {/* ========================================================= */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="800" sx={{ mb: 2, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box component="span" sx={{ width: 5, height: 24, bgcolor: CHART_COLORS.blue, borderRadius: 1 }} />
                        สรุปสถานะปัจจุบัน
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <StatCard title="ผ้าใหม่วันนี้" value={stats.newLinenToday} icon={<NewReleases />} color={CHART_COLORS.new} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinen} icon={<Inventory />} color={theme.palette.primary.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2.4}>
                            <StatCard title="กำลังส่งซัก" value={stats.washing} icon={<LocalLaundryService />} color={CHART_COLORS.orange} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6} lg={2.4}>
                            <StatCard title="พร้อมใช้งาน" value={stats.available} icon={<CheckCircle />} color={theme.palette.success.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6} lg={2.4}>
                            <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart />} color={CHART_COLORS.purple} />
                        </Grid>
                        {/* <Grid item xs={12} sm={6} md={4} lg={2}> // ซ่อนแจ้งชำรุดไว้ตาม UI เดิมของคุณ แต่ถ้าอยากให้ครบก็เปิดได้ครับ
                            <StatCard title="แจ้งชำรุด/หาย" value={stats.disposed || 0} icon={<Warning />} color={theme.palette.error.main} />
                        </Grid> */}
                    </Grid>
                </Box>

                {/* ========================================================= */}
                {/* SECTION 2: Charts */}
                {/* ========================================================= */}
                <Box sx={{ mb: 5 }}>
                    <Typography variant="h6" fontWeight="800" sx={{ mb: 2, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box component="span" sx={{ width: 5, height: 24, bgcolor: CHART_COLORS.purple, borderRadius: 1 }} />
                        การวิเคราะห์เชิงลึก
                    </Typography>

                    <Grid container spacing={3}>

                        {/* --- Bar Chart: 7 Days --- */}
                        <Grid item xs={12} lg={8}>
                            <ChartContainer title="การเคลื่อนไหวของผ้า (7 วันล่าสุด)" subtitle="เปรียบเทียบยอดเบิกใช้ vs ส่งซัก" icon={<Assessment fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                        {/* ✅ interval={0} บังคับแสดงทุกวัน, angle={-25} แกน x เอียงนิดนึงให้อ่านง่าย */}
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }} dy={10} interval={0} angle={-15} textAnchor="end" />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.04) }} />
                                        <Bar dataKey="use" name="เบิกใช้" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} barSize={24} />
                                        <Bar dataKey="wash" name="ส่งซัก" fill={theme.palette.info.main} radius={[6, 6, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        {/* --- Pie Chart: Top Categories --- */}
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
                                                    innerRadius={65}
                                                    outerRadius={90}
                                                    paddingAngle={3}
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
                                            <Typography variant="h4" fontWeight="900" color="text.primary" sx={{ lineHeight: 1 }}>
                                                {pieData.reduce((a, b) => a + b.value, 0).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">Total</Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mt: 2, maxHeight: 130, overflowY: 'auto', pr: 1 }}>
                                        {pieData.map((entry, index) => (
                                            <Stack key={index} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, p: 0.75, borderRadius: 1.5, transition: 'background 0.2s', '&:hover': { bgcolor: alpha(PIE_COLORS[index % PIE_COLORS.length], 0.05) } }}>
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 160, fontSize: '0.9rem', fontWeight: 600, color: theme.palette.text.secondary }}>
                                                        {entry.name}
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="body2" fontWeight="800" color="text.primary">
                                                    {entry.value.toLocaleString()}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Box>
                                </Box>
                            </ChartContainer>
                        </Grid>

                        {/* --- Bar Chart: Monthly Requests --- */}
                        <Grid item xs={12} md={6}>
                            <ChartContainer title="สถิติคำร้อง (6 เดือนล่าสุด)" subtitle="ปริมาณการส่งคำร้องเบิกผ้า/เปลี่ยนผ้ารายเดือน" icon={<InsertChartOutlined fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={requestData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                        {/* ✅ interval={0} บังคับโชว์ให้ครบ 6 เดือน */}
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }} dy={10} interval={0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" name="คำร้อง" fill={CHART_COLORS.purple} radius={[6, 6, 6, 6]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        {/* --- Area Chart: Damaged Trends --- */}
                        <Grid item xs={12} md={6}>
                            <ChartContainer title="แนวโน้มผ้าชำรุด/สูญหาย (6 เดือนล่าสุด)" subtitle="สถิติการตัดจำหน่ายรายเดือน" icon={<Warning sx={{ color: theme.palette.error.main }} fontSize="small" />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={damagedData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorDamaged" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                        {/* ✅ interval={0} บังคับโชว์ให้ครบ 6 เดือน */}
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }} dy={10} interval={0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" name="ชำรุด/จำหน่าย" stroke={theme.palette.error.main} strokeWidth={3} fillOpacity={1} fill="url(#colorDamaged)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>

                        {/* --- Area Chart: Yearly Volume --- */}
                        <Grid item xs={12}>
                            <ChartContainer title="ภาพรวมการหมุนเวียน (12 เดือนล่าสุด)" subtitle="ปริมาณธุรกรรมทั้งหมด (Transaction Volume)" icon={<TrendingUp fontSize="small" />} height={300}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={yearlyData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                                        {/* ✅ interval={0} บังคับโชว์ให้ครบ 12 เดือน */}
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }} dy={10} interval={0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="value" name="จำนวนธุรกรรม" stroke={theme.palette.primary.main} strokeWidth={3} fill="url(#colorValue)" animationDuration={1500} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Grid>
                    </Grid>
                </Box>

                {/* ========================================================= */}
                {/* SECTION 3: Stock by Location */}
                {/* ========================================================= */}
                <Box sx={{ mt: 5 }}>
                    <Typography variant="h6" fontWeight="800" sx={{ mb: 3, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box component="span" sx={{ width: 5, height: 24, bgcolor: theme.palette.success.main, borderRadius: 1 }} />
                        ยอดผ้าคงเหลือจำแนกตามสถานที่ (Stock by Location)
                    </Typography>

                    <Grid container spacing={3}>
                        {Object.keys(locationStock).length === 0 ? (
                            <Grid item xs={12}>
                                <Paper elevation={0} sx={{ p: 6, textAlign: 'center', color: 'text.secondary', borderRadius: 4, border: `2px dashed ${alpha(theme.palette.divider, 0.6)}`, bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                                    <Inventory sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
                                    <Typography variant="h6" fontWeight="600">ไม่พบข้อมูลสถานที่ที่มีผ้าค้างอยู่</Typography>
                                    <Typography variant="body2" color="text.secondary">ระบบจะแสดงข้อมูลเมื่อมีผ้าถูกย้ายไปยังแผนกต่างๆ</Typography>
                                </Paper>
                            </Grid>
                        ) : (
                            Object.entries(locationStock).map(([location, items]) => (
                                <Grid item xs={12} sm={6} lg={4} key={location}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            height: '100%',
                                            borderRadius: '20px',
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderTop: `4px solid ${theme.palette.success.main}`, // เส้นขอบสีเขียวด้านบน
                                            display: 'flex',
                                            flexDirection: 'column',
                                            bgcolor: '#ffffff',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: `0 12px 24px -8px ${alpha(theme.palette.success.main, 0.2)}`,
                                                transform: 'translateY(-4px)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ p: 2.5, bgcolor: alpha(theme.palette.success.main, 0.04), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.main', width: 36, height: 36 }}>
                                                <Room fontSize="small" />
                                            </Avatar>
                                            <Typography variant="subtitle1" fontWeight="800" color="text.primary">
                                                {location}
                                            </Typography>
                                        </Box>
                                        <CardContent sx={{ flexGrow: 1, p: 0, '&:last-child': { pb: 0 } }}>
                                            <List sx={{ width: '100%', p: 0 }}>
                                                {Object.entries(items).map(([itemName, qty], idx) => (
                                                    <React.Fragment key={itemName}>
                                                        <ListItem sx={{ py: 2, px: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s', '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}>
                                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                                {itemName}
                                                            </Typography>
                                                            <Chip
                                                                label={`${qty} ชิ้น`}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: '800',
                                                                    fontSize: '0.8rem',
                                                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                                                    color: 'success.dark',
                                                                    minWidth: '65px',
                                                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                                                                }}
                                                            />
                                                        </ListItem>
                                                        {idx < Object.keys(items).length - 1 && <Divider component="li" sx={{ borderStyle: 'dashed' }} />}
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

            </Container>
        </Box>
    );
};

export default Dashboard;