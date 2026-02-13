import React, { useEffect, useState } from 'react';
import {
    Grid, // ✅ ใช้ Grid มาตรฐาน (v1) เพื่อความชัวร์กับโปรเจกต์เดิม
    Paper, Typography, Box, CircularProgress, Card, CardContent, Stack, Avatar, Container, useTheme, Tooltip as MuiTooltip
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Inventory, ShoppingCart, Warning, CheckCircle, TrendingUp, Assessment, DonutLarge, InsertChartOutlined, DashboardCustomize, NewReleases, LocalLaundryService
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

// --- Theme Colors ---
const COLORS = {
    primary: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    new: '#0ea5e9',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    bgLight: '#f8fafc'
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

    useEffect(() => {
        fetchDashboardData();
        // Auto Refresh Dashboard ทุก 30 วินาที
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            // setLoading(true); // ไม่ต้อง Loading ทุกครั้งที่ Refresh เดี๋ยวตาลาย

            // Parallel Requests
            const [statRes, chartRes] = await Promise.all([
                axiosClient.get('/Dashboard/Stats'),
                axiosClient.get('/Dashboard/ChartData')
            ]);

            setStats(statRes.data);

            // Chart Data
            const data = chartRes.data || {};
            setPieData(data.pieData || []);
            setDailyData(data.dailyData || []);
            setRequestData(data.requestData || []);
            setDamagedData(data.damagedData || []);
            setYearlyData(data.yearlyData || []);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    // --- COMPONENTS ---
    const StatCard = ({ title, value, icon, color }: any) => (
        <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' } }}>
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                        <MuiTooltip title={title}>
                            <Typography variant="body2" color="textSecondary" fontWeight="600" sx={{
                                mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                {title}
                            </Typography>
                        </MuiTooltip>
                        <Typography variant="h4" fontWeight="800" color="textPrimary">
                            {value?.toLocaleString() || 0}
                        </Typography>
                    </Box>
                    <Avatar variant="rounded" sx={{ bgcolor: `${color}15`, color: color, width: 56, height: 56, borderRadius: 3 }}>
                        {React.cloneElement(icon, { fontSize: 'large' })}
                    </Avatar>
                </Stack>
            </CardContent>
        </Card>
    );

    const ChartContainer = ({ title, subtitle, icon, children, height = 380 }: any) => (
        <Paper sx={{
            p: 3, height: '100%', minHeight: height, display: 'flex', flexDirection: 'column',
            bgcolor: '#fff', borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3, pb: 2, borderBottom: `1px dashed ${COLORS.border}` }}>
                {icon && <Box sx={{ color: COLORS.primary, display: 'flex', p: 1, bgcolor: `${COLORS.primary}10`, borderRadius: 2 }}>{icon}</Box>}
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="textPrimary" lineHeight={1.2}>{title}</Typography>
                    {subtitle && <Typography variant="caption" color="textSecondary" fontWeight={500}>{subtitle}</Typography>}
                </Box>
            </Stack>
            <Box sx={{ flexGrow: 1, position: 'relative', minHeight: height - 100 }}>
                {children}
            </Box>
        </Paper>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', p: 2, border: `1px solid ${COLORS.border}`, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="textPrimary" sx={{ mb: 1 }}>{label}</Typography>
                    {payload.map((entry: any, index: number) => (
                        <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color || entry.payload.fill }} />
                            <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>
                                {entry.name}: <span style={{ fontWeight: 'bold', color: COLORS.textPrimary }}>{entry.value.toLocaleString()}</span>
                            </Typography>
                        </Stack>
                    ))}
                </Box>
            );
        }
        return null;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4, pb: 8 }}>
            
            {/* SECTION 1: KPI Cards */}
            <Box sx={{ mb: 5 }}>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: COLORS.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment color="primary" /> สรุปสถานะภาพรวม (Overview)
                </Typography>

                <Grid container spacing={3}>
                    {/* เปลี่ยน size={{...}} เป็น item xs={...} เพื่อรองรับ Grid v1 */}
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="ผ้าใหม่วันนี้" value={stats.newLinenToday} icon={<NewReleases />} color={COLORS.new} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinen} icon={<Inventory />} color={COLORS.primary} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="กำลังส่งซัก" value={stats.washing} icon={<LocalLaundryService />} color={COLORS.warning} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="พร้อมใช้งาน" value={stats.available} icon={<CheckCircle />} color={COLORS.success} />
                    </Grid>
                    
                    {/* แถว 2 */}
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart />} color={COLORS.purple} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="แจ้งชำรุด/ตัดจำหน่าย" value={(stats.damaged || 0) + (stats.disposed || 0)} icon={<Warning />} color={COLORS.danger} />
                    </Grid>
                </Grid>
            </Box>

            {/* SECTION 2: Charts */}
            <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <DashboardCustomize sx={{ color: COLORS.primary }} />
                    <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.textPrimary }}>
                        สถิติและการวิเคราะห์ (Analytics)
                    </Typography>
                </Stack>

                <Grid container spacing={3}>
                    {/* ROW 1: Bar Chart & Pie Chart */}
                    <Grid item xs={12} lg={8}>
                        <ChartContainer title="การเคลื่อนไหวของผ้า (7 วันล่าสุด)" subtitle="เปรียบเทียบยอดเบิกใช้ vs ส่งซัก" icon={<Assessment fontSize="small" />}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12, fontWeight: 500 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.bgLight, opacity: 0.5 }} />
                                    <Bar dataKey="use" name="เบิกใช้" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="wash" name="ส่งซัก" fill={COLORS.info} radius={[4, 4, 0, 0]} barSize={20} />
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
                                                innerRadius="55%"
                                                outerRadius="75%"
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
                                        <Typography variant="h4" fontWeight="800" color="textPrimary" sx={{ lineHeight: 1 }}>
                                            {pieData.reduce((a, b) => a + b.value, 0).toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" fontWeight="600">Total</Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 2, maxHeight: 150, overflowY: 'auto', pr: 1 }}>
                                    {pieData.map((entry, index) => (
                                        <Stack key={index} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, p: 0.5, borderRadius: 1, '&:hover': { bgcolor: COLORS.bgLight } }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontSize: '0.85rem', fontWeight: 500 }}>
                                                    {entry.name}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" fontWeight="bold" color="textPrimary">
                                                {entry.value.toLocaleString()}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        </ChartContainer>
                    </Grid>

                    {/* ROW 2: Additional Charts */}
                    <Grid item xs={12} md={6}>
                        <ChartContainer title="สถิติคำร้องรายเดือน" subtitle="ปริมาณคำร้องเบิกผ้าตลอดปี" icon={<InsertChartOutlined fontSize="small" />}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={requestData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="count" name="คำร้อง" fill={COLORS.purple} radius={[4, 4, 4, 4]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ChartContainer title="แนวโน้มผ้าชำรุด" subtitle="สถิติการแจ้งชำรุดรายเดือน" icon={<Warning sx={{ color: COLORS.danger }} fontSize="small" />}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={damagedData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorDamaged" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="count" name="ชำรุด" stroke={COLORS.danger} strokeWidth={2} fillOpacity={1} fill="url(#colorDamaged)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </Grid>

                    {/* ROW 3: Yearly Overview */}
                    <Grid item xs={12}>
                        <ChartContainer title="ภาพรวมการหมุนเวียนตลอดปี" subtitle="ปริมาณธุรกรรมทั้งหมด (Transaction Volume)" icon={<TrendingUp fontSize="small" />}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={yearlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.textSecondary, fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="value" name="จำนวนธุรกรรม" stroke={COLORS.primary} strokeWidth={3} fill="url(#colorValue)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </Grid>

                </Grid>
            </Box>
        </Container>
    );
};

export default Dashboard;