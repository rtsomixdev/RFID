import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, Button, Paper, CircularProgress, Grid, Chip, Avatar } from '@mui/material';
import { Login, Wifi, CheckCircle, Autorenew, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({ totalLinens: 0, status: 'Online', lastActivity: '-' });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ เพิ่ม State เช็คสถานะ Login
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // นาฬิกาเดิน
    const timer = setInterval(() => setTime(new Date()), 1000);

    // ✅ เช็ค User จาก LocalStorage
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        setCurrentUser(JSON.parse(userStr));
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitorData = async () => {
    try {
      const res = await axiosClient.get('/Dashboard/Stats'); 
      setStats({
          totalLinens: res.data.totalLinens || 0,
          status: 'Online',
          lastActivity: 'รอการสแกน'
      });
      setLoading(false);
    } catch (err) {
      console.error("Monitor Error", err);
      setStats(prev => ({ ...prev, status: 'Offline' }));
      setLoading(false);
    }
  };

  const StatusCard = ({ title, value, icon, color, subtext }: any) => (
      <Paper elevation={0} sx={{ 
          p: 4, 
          borderRadius: 5, 
          textAlign: 'center', 
          height: '100%',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          bgcolor: '#fff'
      }}>
          <Box sx={{ bgcolor: `${color}15`, color: color, p: 2, borderRadius: '50%', mb: 2, display: 'flex' }}>
              {icon}
          </Box>
          <Typography variant="body1" color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h3" fontWeight="bold" sx={{ color: '#1e293b', my: 1 }}>
              {value}
          </Typography>
          {subtext && <ChipLabel text={subtext} />}
      </Paper>
  );

  const ChipLabel = ({ text }: { text: string }) => (
      <Box sx={{ bgcolor: '#f1f5f9', px: 2, py: 0.5, borderRadius: 4, mt: 1 }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary">{text}</Typography>
      </Box>
  );

  return (
    <Box sx={{ p: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Header Section --- */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
        <Box>
            <Typography variant="h4" fontWeight="bold" color="#1e293b" gutterBottom>
            RFID Monitor Station
            </Typography>
            <Typography variant="body1" color="text.secondary">
            ระบบเฝ้าระวังและติดตามผ้าอัจฉริยะ
            </Typography>
        </Box>
        
        <Stack direction="row" spacing={3} alignItems="center">
            {/* นาฬิกา */}
            <Typography variant="h4" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {time.toLocaleTimeString('th-TH')} น.
            </Typography>

            {/* ✅ ปุ่ม Login / User Profile */}
            {currentUser ? (
                // ถ้า Login แล้ว: โชว์ชื่อ หรือไม่ต้องโชว์ปุ่มอะไรเลยก็ได้ (เพราะมี Sidebar แล้ว)
                // อันนี้ใส่ไว้เผื่ออยากให้รู้ว่าใคร Login อยู่
                 <Chip 
                    avatar={<Avatar><Person /></Avatar>} 
                    label={`สวัสดี, ${currentUser.firstName}`} 
                    variant="outlined"
                    sx={{ borderColor: '#e2e8f0', bgcolor: '#fff', fontSize: '1rem', height: 48, px: 1 }}
                />
            ) : (
                // ถ้ายังไม่ Login: โชว์ปุ่มเข้าสู่ระบบ
                <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<Login />}
                    onClick={() => navigate('/login')}
                    sx={{ 
                        borderRadius: 3, 
                        px: 3, 
                        py: 1.5, 
                        textTransform: 'none',
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)'
                    }}
                >
                    เข้าสู่ระบบ
                </Button>
            )}
        </Stack>
      </Stack>

      {/* --- Content Section --- */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
            <CircularProgress size={60} thickness={4} />
        ) : (
            <Grid container spacing={4} maxWidth="lg">
                <Grid item xs={12} md={4}>
                    <StatusCard 
                        title="จำนวนผ้าในระบบ" 
                        value={stats.totalLinens} 
                        subtext="ชิ้น"
                        icon={<Autorenew sx={{ fontSize: 40 }} />} 
                        color="#3b82f6" 
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatusCard 
                        title="สถานะเกตเวย์" 
                        value={stats.status} 
                        icon={<Wifi sx={{ fontSize: 40 }} />} 
                        color={stats.status === 'Online' ? '#10b981' : '#ef4444'} 
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatusCard 
                        title="กิจกรรมล่าสุด" 
                        value={stats.status === 'Online' ? "รอการสแกน" : "-"} 
                        icon={<CheckCircle sx={{ fontSize: 40 }} />} 
                        color="#f59e0b" 
                    />
                </Grid>

                {/* ส่วนแสดงรายการสแกนล่าสุด */}
                <Grid item xs={12}>
                    <Paper sx={{ 
                        p: 4, 
                        borderRadius: 5, 
                        minHeight: 180, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        bgcolor: '#fff', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                    }}>
                        <Typography variant="h6" color="text.secondary" fontWeight="bold" gutterBottom>
                            รายการสแกนล่าสุด
                        </Typography>
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: '#f8fafc', 
                            borderRadius: 3, 
                            width: '100%', 
                            textAlign: 'center', 
                            border: '1px dashed #cbd5e1' 
                        }}>
                             <Typography color="text.disabled">ยังไม่มีรายการสแกน</Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        )}
      </Box>

    </Box>
  );
};

export default Home;