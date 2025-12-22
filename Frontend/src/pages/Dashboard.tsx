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
  border: '#e2e8f0'
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
    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: `1px solid ${COLORS.border}` }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="textSecondary" fontWeight="600" sx={{ mb: 0.5, display: 'block' }}>{title}</Typography>
            <Typography variant="h5" fontWeight="bold" color="textPrimary">
              {value?.toLocaleString() || 0}
            </Typography>
          </Box>
          <Avatar variant="rounded" sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48, borderRadius: 2 }}>
            {icon}
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
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)', 
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column'
    }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        {icon && <Box sx={{ color: COLORS.textSecondary, display: 'flex' }}>{icon}</Box>}
        <Box>
            <Typography variant="h6" fontWeight="bold" color="textPrimary" lineHeight={1.2}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
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
        <Box sx={{ bgcolor: '#fff', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color, fontSize: '0.85rem' }}>
              {entry.name}: <b>{entry.value.toLocaleString()}</b>
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" color="textPrimary" sx={{ letterSpacing: '-0.5px' }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          ภาพรวมระบบและการเคลื่อนไหวของผ้า (Real-time Monitor)
        </Typography>
      </Box>

      {/* SECTION 1: KPI Summary */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: COLORS.textPrimary }}>
            สรุปสถานะรายวัน
        </Typography>
        <Grid container spacing={3}>
            <Grid item xs={6} md={6} lg={3}>
                <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinens} icon={<Inventory />} color={COLORS.primary} />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
                <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart />} color={COLORS.warning} />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
                <StatCard title="เบิกจ่ายวันนี้" value={stats.approvedToday} icon={<CheckCircle />} color={COLORS.success} />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
                <StatCard title="แจ้งชำรุดสะสม" value={stats.damagedItems} icon={<Warning />} color={COLORS.danger} />
            </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 5, borderStyle: 'dashed' }} />

      {/* SECTION 2: Charts & Analytics */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <DashboardCustomize sx={{ color: COLORS.primary }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.textPrimary }}>
                สถิติและการวิเคราะห์
            </Typography>
        </Stack>

        <Grid container spacing={3}>
            
            {/* ROW 1 */}
            <Grid item xs={12} lg={8}>
                <ChartContainer title="การเคลื่อนไหวของผ้า (7 วันล่าสุด)" subtitle="Use vs Wash Comparison" icon={<Assessment />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="use" name="เบิกใช้" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={isMobile ? 12 : 28} />
                            <Bar dataKey="wash" name="ส่งซัก" fill={COLORS.info} radius={[4, 4, 0, 0]} barSize={isMobile ? 12 : 28} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </Grid>

            {/* --- แก้ไขส่วน Pie Chart ตรงนี้ --- */}
{/* --- แก้ไขส่วน Pie Chart (Final Fix) --- */}
            <Grid item xs={12} lg={4}>
                <ChartContainer title="สัดส่วนประเภทผ้า" subtitle="Top Fabric Types" icon={<DonutLarge />}>
                    
                    {/* Box Wrapper: เพิ่ม px เพื่อบีบพื้นที่แนวนอนให้กราฟอยู่ตรงกลางไม่ชิดขอบ Card เกินไป */}
                    <Box sx={{ height: '100%', width: '100%', px: 1 }}> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="45%"  // ขยับขึ้นลงตามความเหมาะสม (45% คือค่อนไปทางบนนิดหน่อยเผื่อ Legend)
                                    
                                    // *** จุดสำคัญที่แก้: ใช้ % แทนตัวเลข ***
                                    innerRadius="60%"  // ขนาดรูตรงกลาง (สัมพันธ์กับ outer)
                                    outerRadius="80%"  // ขนาดวงนอก (เหลือพื้นที่ 20% กันตัดขอบ)
                                    
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
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
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Text Overlay: ปรับตำแหน่งให้ตรงกับ cy="45%" */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: '45%',  // ต้องตรงกับ cy ของ Pie
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        textAlign: 'center', 
                        pointerEvents: 'none' 
                    }}>
                        <Typography variant="h4" fontWeight="bold" color="textPrimary">{pieData.length}</Typography>
                        <Typography variant="caption" color="textSecondary">Types</Typography>
                    </Box>
                </ChartContainer>
            </Grid>

            {/* ROW 2 */}
            <Grid item xs={12} md={6}>
                <ChartContainer title="สถิติคำร้องรายเดือน" subtitle="Requests Volume" height={320} icon={<InsertChartOutlined />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textSecondary, fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="count" name="คำร้อง" fill={COLORS.purple} radius={[4, 4, 4, 4]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </Grid>

            <Grid item xs={12} md={6}>
                <ChartContainer title="แนวโน้มผ้าชำรุด" subtitle="Damaged Trends" height={320} icon={<Warning sx={{ color: COLORS.danger }} />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={damagedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDamaged" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.2}/>
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
                <ChartContainer title="ภาพรวมการหมุนเวียนตลอดปี" subtitle="Yearly Transaction Volume Overview" height={380} icon={<TrendingUp />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
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