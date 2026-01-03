import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Stack, Avatar, Container, useTheme, useMediaQuery, Divider
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  Inventory, ShoppingCart, Warning, CheckCircle, TrendingUp, Assessment, DonutLarge, InsertChartOutlined, DashboardCustomize
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
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  
  // --- STATE ---
  const [stats, setStats] = useState<any>({});
  const [pieData, setPieData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [requestData, setRequestData] = useState<any[]>([]);
  const [damagedData, setDamagedData] = useState<any[]>([]);
  
  const yearlyData = [
    { name: 'ม.ค.', value: 2400 }, { name: 'ก.พ.', value: 1398 }, { name: 'มี.ค.', value: 5800 },
    { name: 'เม.ย.', value: 3908 }, { name: 'พ.ค.', value: 4800 }, { name: 'มิ.ย.', value: 3800 },
    { name: 'ก.ค.', value: 4300 }, { name: 'ส.ค.', value: 5300 }, { name: 'ก.ย.', value: 4500 },
    { name: 'ต.ค.', value: 6000 }, { name: 'พ.ย.', value: 5500 }, { name: 'ธ.ค.', value: 7000 },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statRes = await axiosClient.get('/Dashboard/Stats');
      setStats(statRes.data);

      const chartRes = await axiosClient.get('/Dashboard/ChartData');
      const data = chartRes.data;

      setPieData(data.pieData || []);
      setDailyData(data.dailyData || []);
      setRequestData(data.requestData || []);
      setDamagedData(data.damagedData || []);
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
    <Card sx={{ height: '100%', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.border}`, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="start">
          <Box>
            <Typography variant="body2" color="textSecondary" fontWeight="600" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Typography>
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

  const ChartContainer = ({ title, subtitle, icon, children, height = 400 }: any) => (
    <Paper sx={{ 
        p: 3, 
        height: '100%', 
        minHeight: height,
        borderRadius: 4, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff'
    }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3, pb: 2, borderBottom: `1px dashed ${COLORS.border}` }}>
        {icon && <Box sx={{ color: COLORS.primary, display: 'flex', p: 1, bgcolor: `${COLORS.primary}10`, borderRadius: 2 }}>{icon}</Box>}
        <Box>
            <Typography variant="h6" fontWeight="bold" color="textPrimary" lineHeight={1.2}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="textSecondary" fontWeight={500}>{subtitle}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {children}
      </Box>
    </Paper>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', p: 2, border: `1px solid ${COLORS.border}`, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="textPrimary" sx={{ mb: 1 }}>{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight="800" color="textPrimary" sx={{ letterSpacing: '-0.5px', mb: 1 }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body1" color="textSecondary">
          ภาพรวมระบบและการเคลื่อนไหวของผ้า (Real-time Monitor)
        </Typography>
      </Box>

      {/* SECTION 1: KPI Summary */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: COLORS.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment fontSize="small" color="primary"/> สรุปสถานะรายวัน
        </Typography>
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={3}>
                <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinens} icon={<Inventory />} color={COLORS.primary} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
                <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart />} color={COLORS.warning} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
                <StatCard title="เบิกจ่ายวันนี้" value={stats.approvedToday} icon={<CheckCircle />} color={COLORS.success} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
                <StatCard title="แจ้งชำรุดสะสม" value={stats.damagedItems} icon={<Warning />} color={COLORS.danger} />
            </Grid>
        </Grid>
      </Box>

      {/* SECTION 2: Charts & Analytics */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <DashboardCustomize sx={{ color: COLORS.primary }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.textPrimary }}>
                สถิติและการวิเคราะห์เชิงลึก
            </Typography>
        </Stack>

        <Grid container spacing={3}>
            
            {/* ROW 1 */}
            <Grid item xs={12} lg={8}>
                <ChartContainer title="การเคลื่อนไหวของผ้า (7 วันล่าสุด)" subtitle="เปรียบเทียบยอดเบิกใช้ vs ส่งซัก" icon={<Assessment fontSize="small" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12, fontWeight: 500}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: COLORS.bgLight, opacity: 0.5}} />
                            <Bar dataKey="use" name="เบิกใช้" fill={COLORS.primary} radius={[6, 6, 0, 0]} barSize={isMobile ? 12 : 24} />
                            <Bar dataKey="wash" name="ส่งซัก" fill={COLORS.info} radius={[6, 6, 0, 0]} barSize={isMobile ? 12 : 24} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </Grid>

            {/* Pie Chart */}
            <Grid item xs={12} lg={4}>
                <ChartContainer title="สัดส่วนประเภทผ้า" subtitle="จำแนกตามชนิดสินค้า Top 5" icon={<DonutLarge fontSize="small" />}>
                    <Box sx={{ height: '100%', width: '100%', px: 1 }}> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="45%" 
                                    innerRadius="65%" 
                                    outerRadius="85%" 
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle" 
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500, color: COLORS.textSecondary }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Text Overlay */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: '45%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        textAlign: 'center', 
                        pointerEvents: 'none' 
                    }}>
                        <Typography variant="h3" fontWeight="800" color="textPrimary" sx={{ lineHeight: 1 }}>{pieData.length}</Typography>
                        <Typography variant="caption" color="textSecondary" fontWeight="600" sx={{ textTransform: 'uppercase' }}>Types</Typography>
                    </Box>
                </ChartContainer>
            </Grid>

            {/* ROW 2 */}
            <Grid item xs={12} md={6}>
                <ChartContainer title="สถิติคำร้องรายเดือน" subtitle="ปริมาณคำร้องเบิกผ้าตลอดปี" height={350} icon={<InsertChartOutlined fontSize="small" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="count" name="คำร้อง" fill={COLORS.purple} radius={[6, 6, 6, 6]} barSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </Grid>

            <Grid item xs={12} md={6}>
                <ChartContainer title="แนวโน้มผ้าชำรุด" subtitle="สถิติการแจ้งชำรุดรายเดือน" height={350} icon={<Warning sx={{ color: COLORS.danger }} fontSize="small" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={damagedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDamaged" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" name="ชำรุด" stroke={COLORS.danger} strokeWidth={3} fillOpacity={1} fill="url(#colorDamaged)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </Grid>

            {/* ROW 3 */}
            <Grid item xs={12}>
                <ChartContainer title="ภาพรวมการหมุนเวียนตลอดปี" subtitle="Yearly Transaction Volume Overview" height={400} icon={<TrendingUp fontSize="small" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
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