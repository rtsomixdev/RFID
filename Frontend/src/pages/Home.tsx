import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  Box, Paper, Typography, Grid, Card, CardContent, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, CircularProgress, Button
} from '@mui/material';
import { 
  WifiTethering, LocationOn, CheckCircle, Login, Dashboard, AccessTime
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // เช็ค User
  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get('/Linen/Monitor/Latest');
        setItems(res.data || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData(); 
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const latestLocation = items.length > 0 ? items[0].location : "-";

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status?.includes('Damage')) return 'error';
    return 'warning';
  };

  return (
    // Container หลัก
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3, bgcolor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* --- 1. Header --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', letterSpacing: '-0.5px' }}>
              RFID Real-time Monitor
            </Typography>
            <Typography variant="body1" color="textSecondary">
               ระบบติดตามผ้าและสถานะเครื่องอ่านอัตโนมัติ
            </Typography>
        </Box>
        <Box>
            {!user ? (
                <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<Login />}
                    onClick={() => navigate('/login')}
                    sx={{ borderRadius: 3, px: 4, py: 1.5, fontSize: '1rem', bgcolor: '#0ea5e9' }}
                >
                    เข้าสู่ระบบ
                </Button>
            ) : (
                <Button 
                    variant="outlined" 
                    size="large"
                    startIcon={<Dashboard />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ borderRadius: 3, px: 4, py: 1.5, fontSize: '1rem', borderWidth: 2 }}
                >
                    Dashboard
                </Button>
            )}
        </Box>
      </Box>

      {/* --- 2. Cards Section (แนวนอน 3 ใบ) --- */}
      <Grid container spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
        
        {/* Card 1: Reader Status */}
        <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3, bgcolor: '#1e293b', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Reader Status</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <WifiTethering fontSize="large" /> ONLINE
                        </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 50, color: '#4ade80', opacity: 0.8 }} />
                </CardContent>
            </Card>
        </Grid>

        {/* Card 2: Location */}
        <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3, bgcolor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
                        <LocationOn sx={{ color: '#0ea5e9' }} />
                        <Typography variant="body2" color="textSecondary">สถานที่สแกนล่าสุด</Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="#0f172a" sx={{ lineHeight: 1.2 }}>
                        {latestLocation}
                    </Typography>
                </CardContent>
            </Card>
        </Grid>

        {/* Card 3: Count */}
        <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', borderRadius: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="#0369a1" fontWeight="bold">รายการล่าสุด</Typography>
                    <Typography variant="h3" fontWeight="bold" color="#0284c7" sx={{ mt: 1 }}>
                        {items.length} <span style={{ fontSize: '1rem', color: '#0ea5e9' }}>ชิ้น</span>
                    </Typography>
                </CardContent>
            </Card>
        </Grid>

      </Grid>

      {/* --- 3. Table Section (ด้านล่าง เต็มจอ) --- */}
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
            <Paper sx={{ width: '100%', borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                
                {/* Table Header */}
                <Box sx={{ p: 2, px: 3, bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="#1e293b">
                        รายการที่สแกนล่าสุด (50 รายการ)
                    </Typography>
                    <Chip label="Real-time Update" size="small" color="success" variant="outlined" sx={{ borderRadius: 1 }} />
                </Box>
                
                {/* Table Body (Scrollable) */}
                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', pl: 3, width: '15%' }}>เวลา</TableCell>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', width: '20%' }}>RFID</TableCell>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', width: '30%' }}>ชื่อรายการ</TableCell>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', width: '20%' }}>สถานที่</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', pr: 3, width: '15%' }}>สถานะ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: '#94a3b8' }}>ยังไม่มีข้อมูลการสแกน</TableCell></TableRow>
                            ) : (
                                items.map((row, index) => (
                                    <TableRow key={index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ fontFamily: 'monospace', color: '#64748b', pl: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AccessTime fontSize="small" sx={{ fontSize: 16, opacity: 0.7 }} /> {row.timestamp}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#334155' }}>{row.rfid}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{row.productName}</TableCell>
                                        <TableCell sx={{ color: '#475569' }}>{row.location}</TableCell>
                                        <TableCell align="right" sx={{ pr: 3 }}>
                                            <Chip 
                                                label={row.status} 
                                                size="small" 
                                                color={getStatusColor(row.status) as any} 
                                                sx={{ minWidth: 80, fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
      </Box>

    </Box>
  );
};

export default Home;