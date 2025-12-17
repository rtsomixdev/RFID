import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Stack, Avatar, Divider
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, LabelList
} from 'recharts';
import { 
  Inventory, ShoppingCart, Warning, CheckCircle, TrendingUp 
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

// --- Color Palette (Modern Style) ---
const COLORS = {
  blue: '#3b82f6',    // Primary
  cyan: '#06b6d4',    // Info
  pink: '#f43f5e',    // Danger/Warning
  purple: '#a855f7',  // Accent
  orange: '#f97316',  // Alert
  green: '#10b981',   // Success
  grayBar: '#e2e8f0', // Background Bar
  text: '#64748b',    // Text Color
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState<any>({});
  const [pieData, setPieData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [requestData, setRequestData] = useState<any[]>([]);
  const [damagedData, setDamagedData] = useState<any[]>([]);
  
  // Mock Yearly Data (ข้อมูลสมมติสำหรับกราฟพื้นที่ด้านล่าง เพื่อความสวยงาม)
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
      
      // 1. ดึงข้อมูลตัวเลข (Stats Cards)
      const statRes = await axiosClient.get('/Dashboard/Stats');
      setStats(statRes.data);

      // 2. ดึงข้อมูลกราฟ (Chart Data)
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

  // --- Components ย่อย (Stat Card) ---
  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card sx={{ height: '100%', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>{title}</Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
              {value?.toLocaleString() || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: color, fontWeight: 'medium', mt: 0.5, display: 'block' }}>
               {subtitle}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 56, height: 56, borderRadius: 3 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );

  // Styles
  const cardStyle = { 
    p: 3, 
    borderRadius: 4, 
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)', 
    bgcolor: '#fff', 
    height: '100%',
    border: '1px solid #f1f5f9'
  };
  const titleStyle = { fontWeight: 700, color: '#334155', mb: 3, fontSize: '1.1rem' };

  return (
    <Box sx={{ flexGrow: 1, pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ภาพรวมข้อมูลระบบและการเคลื่อนไหวของผ้า
        </Typography>
      </Box>

      <Grid container spacing={3}>
        
        {/* === ROW 1: KPI Cards === */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="ผ้าทั้งหมดในระบบ" value={stats.totalLinens} icon={<Inventory fontSize="large" />} color={COLORS.blue} subtitle="Active Items" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="คำร้องรออนุมัติ" value={stats.pendingRequests} icon={<ShoppingCart fontSize="large" />} color={COLORS.orange} subtitle="Pending Action" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="เบิกจ่ายวันนี้" value={stats.approvedToday} icon={<CheckCircle fontSize="large" />} color={COLORS.green} subtitle="Approved Today" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="แจ้งชำรุดสะสม" value={stats.damagedItems} icon={<Warning fontSize="large" />} color={COLORS.pink} subtitle="Damaged Items" />
        </Grid>

        {/* === ROW 2: Daily Activity (Main Chart) & Inventory Ratio === */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ ...cardStyle, height: 450 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={titleStyle}>การเคลื่อนไหวผ้า (7 วันล่าสุด)</Typography>
                <Stack direction="row" spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 10, height: 10, bgcolor: COLORS.blue, borderRadius: '50%' }} /><Typography variant="caption" fontWeight="bold">เบิกใช้</Typography></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 10, height: 10, bgcolor: COLORS.cyan, borderRadius: '50%' }} /><Typography variant="caption" fontWeight="bold">ส่งซัก</Typography></Box>
                </Stack>
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={dailyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="use" name="เบิกใช้" fill={COLORS.blue} radius={[6, 6, 6, 6]} barSize={16} />
                <Bar dataKey="wash" name="ส่งซัก" fill={COLORS.cyan} radius={[6, 6, 6, 6]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ ...cardStyle, height: 450 }}>
            <Typography sx={titleStyle}>สัดส่วนประเภทผ้า</Typography>
            <Box sx={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={[COLORS.blue, COLORS.orange, COLORS.pink, COLORS.purple, COLORS.green][index % 5]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* === ROW 3: Statistics Split (Requests vs Damaged) === */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...cardStyle, height: 380 }}>
             <Typography sx={titleStyle}>จำนวนคำร้อง (รายเดือน)</Typography>
             <ResponsiveContainer width="100%" height="85%">
              <BarChart data={requestData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" name="คำร้อง" radius={[6, 6, 6, 6]} barSize={32}>
                    <LabelList dataKey="count" position="top" style={{ fill: COLORS.text, fontSize: 12, fontWeight: 'bold' }} />
                    {requestData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.active ? COLORS.purple : COLORS.grayBar} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
           <Paper sx={{ ...cardStyle, height: 380 }}>
             <Typography sx={titleStyle}>สถิติแจ้งชำรุด (รายเดือน)</Typography>
             <ResponsiveContainer width="100%" height="85%">
              <BarChart data={damagedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" name="ชำรุด" radius={[6, 6, 6, 6]} barSize={32}>
                    <LabelList dataKey="count" position="top" style={{ fill: COLORS.text, fontSize: 12, fontWeight: 'bold' }} />
                    {damagedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.active ? COLORS.pink : COLORS.grayBar} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
           </Paper>
        </Grid>

        {/* === ROW 4: Overall Trend (Area Chart) === */}
        <Grid item xs={12}>
            <Paper sx={{ ...cardStyle, height: 350 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUp sx={{ color: COLORS.blue }} />
                    <Typography sx={{ ...titleStyle, mb: 0 }}>แนวโน้มการหมุนเวียนผ้าตลอดปี</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                <ResponsiveContainer width="100%" height="75%">
                <AreaChart data={yearlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.text, fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={COLORS.blue} 
                        strokeWidth={3} 
                        fill="url(#colorValue)" 
                        animationDuration={1500}
                    />
                </AreaChart>
                </ResponsiveContainer>
            </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;