import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  Box, Paper, Typography, Card, CardContent, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, CircularProgress, Button, Badge, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider
} from '@mui/material';
import { 
  WifiTethering, LocationOn, CheckCircle, Login, Dashboard,
  Warning, HelpOutline, History, DeleteOutline, Build
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

// Interface
interface MonitorItem {
  rfid: string;
  productName: string;
  location: string;
  status: string;
  timestamp: string;
}

interface SystemLogItem {
    id: number;
    item: string; 
    time: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [registeredItems, setRegisteredItems] = useState<MonitorItem[]>([]);
  const [unknownItems, setUnknownItems] = useState<MonitorItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<SystemLogItem[]>([]); 
  const [loading, setLoading] = useState(true);
  const [allItemsCount, setAllItemsCount] = useState(0);

  const userStr = localStorage.getItem('currentUser');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resMonitor = await axiosClient.get('/Linen/Monitor/Latest');
        const data: MonitorItem[] = resMonitor.data || [];
        
        const unk = data.filter(d => 
            d.productName === 'Unknown' || 
            d.productName === 'ไม่พบในระบบ' || 
            d.status === 'Alien' || 
            d.status === 'Disposed'
        );

        const reg = data.filter(d => 
            d.productName !== 'Unknown' && 
            d.productName !== 'ไม่พบในระบบ' && 
            d.status !== 'Alien' && 
            d.status !== 'Disposed'
        );

        setRegisteredItems(reg);
        setUnknownItems(unk);
        setAllItemsCount(data.length);

        const resLogs = await axiosClient.get('/Linen/DeleteHistory'); 
        setRecentLogs(resLogs.data || []);

        setLoading(false);
      } catch (err) { console.error(err); }
    };

    fetchData(); 
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const latestLocation = registeredItems.length > 0 ? registeredItems[0].location : (unknownItems.length > 0 ? unknownItems[0].location : "-");

  const getStatusColor = (status: string) => {
    if (status === 'Available') return 'success';
    if (status?.includes('Damage')) return 'error';
    if (status === 'In Use') return 'primary';
    if (status === 'Washing') return 'info';
    return 'warning';
  };

  return (
    // ✅ Fix: ใช้ Flex Layout แบบควบคุมแกนเอง (ไม่ใช้ Grid Wrap แบบเดิมที่ทำให้หล่นหาย)
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* --- Header & Stats (Fixed Top) --- */}
      <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
                <Typography variant="h5" fontWeight="bold" color="#1e293b">หน้าหลัก (Monitor)</Typography>
                <Typography variant="caption" color="textSecondary">ระบบติดตามผ้าและแจ้งเตือนวัตถุแปลกปลอม</Typography>
            </Box>
            <Box>
                {!user ? (
                    <Button variant="contained" size="small" startIcon={<Login />} onClick={() => navigate('/login')} sx={{ borderRadius: 2 }}>เข้าสู่ระบบ</Button>
                ) : (
                    <Button variant="outlined" size="small" startIcon={<Dashboard />} onClick={() => navigate('/dashboard')} sx={{ borderRadius: 2 }}>Dashboard</Button>
                )}
            </Box>
          </Box>

          {/* Stat Cards Row */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Card sx={{ flex: 1, borderRadius: 3, bgcolor: '#1e293b', color: '#fff' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>READER STATUS</Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 1 }}><WifiTethering fontSize="small" /> ONLINE</Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 32, color: '#4ade80', opacity: 0.8 }} />
                </CardContent>
            </Card>
            <Card sx={{ flex: 1, borderRadius: 3 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="textSecondary">LATEST LOCATION</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0f172a" noWrap sx={{ maxWidth: 200 }}>{latestLocation}</Typography>
                    </Box>
                    <LocationOn sx={{ fontSize: 32, color: '#0ea5e9' }} />
                </CardContent>
            </Card>
            <Card sx={{ flex: 1, borderRadius: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', boxShadow: 'none' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="#0369a1" fontWeight="bold">TOTAL SCAN</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0284c7">{allItemsCount} Items</Typography>
                    </Box>
                    <Dashboard sx={{ fontSize: 32, color: '#0ea5e9' }} />
                </CardContent>
            </Card>
          </Box>
      </Box>

      {/* --- Main Content Split (Flex Row) --- */}
      {/* ใช้ overflow: auto ที่ container นี้ เพื่อให้ถ้าจอเล็กจริงๆ ก็ Scroll ได้ทั้งหน้า */}
      <Box sx={{ 
          flexGrow: 1, 
          p: 2, 
          pt: 1,
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, // เล็ก=ตั้ง, ใหญ่=นอน
          gap: 2,
          overflow: { xs: 'auto', md: 'hidden' }, // จอเล็ก Scroll ได้, จอใหญ่ Fix
          minHeight: 0 // สำคัญ! เพื่อให้ flex child scroll ได้
      }}>
        
        {/* 🟢 Left: Registered Items (65% width on desktop) */}
        <Paper sx={{ 
            flex: { xs: 'none', md: 2 }, 
            height: { xs: '500px', md: '100%' }, // จอเล็ก Fix สูง, จอใหญ่เต็มพื้นที่
            borderRadius: 3, 
            overflow: 'hidden', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column' 
        }}>
            <Box sx={{ p: 1.5, px: 2, bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle fontSize="small" color="success" />
                    <Typography variant="subtitle1" fontWeight="bold" color="#14532d">Registered Items</Typography>
                </Box>
                <Chip label={`${registeredItems.length}`} size="small" color="success" />
            </Box>
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Time</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>RFID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Item Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Location</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>
                        ) : registeredItems.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10, color: '#94a3b8' }}>Waiting for scan...</TableCell></TableRow>
                        ) : (
                            registeredItems.map((row, index) => (
                                <TableRow key={index} hover sx={{ '& td': { py: 0.8 } }}>
                                    <TableCell sx={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>{row.timestamp}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem' }}>{row.rfid}</TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem' }}>{row.productName}</TableCell>
                                    <TableCell sx={{ color: '#475569', fontSize: '0.8rem' }}>{row.location}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={row.status} size="small" color={getStatusColor(row.status) as any} sx={{ minWidth: 70, height: 22, fontSize: '0.7rem' }} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>

        {/* 🔴 Right: Split Top/Bottom (35% width on desktop) */}
        <Box sx={{ 
            flex: { xs: 'none', md: 1 }, 
            height: { xs: 'auto', md: '100%' }, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2 
        }}>
            
            {/* Unknown Objects (Fix Height 40%) */}
            <Paper sx={{ 
                height: { xs: '300px', md: '40%' }, 
                borderRadius: 3, 
                overflow: 'hidden', 
                border: '1px solid #fecaca', 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: '#fff1f2',
                flexShrink: 0 // ห้ามหด
            }}>
                <Box sx={{ p: 1.5, px: 2, bgcolor: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge badgeContent={unknownItems.length} color="error" variant="dot">
                            <Warning fontSize="small" color="error" />
                        </Badge>
                        <Typography variant="subtitle1" fontWeight="bold" color="#991b1b">Unknown Objects</Typography>
                    </Box>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
                    {unknownItems.length === 0 ? (
                          <Box sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fca5a5' }}>
                            <CheckCircle sx={{ fontSize: 40, mb: 1, opacity: 0.5, alignSelf: 'center' }} />
                            <Typography variant="body2">Secure Area</Typography>
                            <Typography variant="caption">No alien tags detected</Typography>
                        </Box>
                    ) : (
                        unknownItems.map((item, index) => (
                            <Paper key={index} elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: '#fff', border: '1px solid #fecaca', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 2s infinite' }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="error" sx={{ fontFamily: 'monospace' }}>{item.rfid}</Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">{item.timestamp}</Typography>
                                </Box>
                                <HelpOutline color="error" />
                            </Paper>
                        ))
                    )}
                </Box>
            </Paper>

            {/* System Activity (Fill Remaining) */}
            <Paper sx={{ 
                flexGrow: 1, 
                height: { xs: '300px', md: 'auto' }, // จอเล็ก Fix สูง
                borderRadius: 3, 
                overflow: 'hidden', 
                border: '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: '#fff', 
                minHeight: 0 
            }}>
                <Box sx={{ p: 1.5, px: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <History fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">System Activity</Typography>
                </Box>
                
                <List sx={{ flexGrow: 1, overflowY: 'auto', py: 0 }}>
                    {recentLogs.length === 0 ? (
                         <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                             <Typography variant="caption">No recent activity</Typography>
                         </Box>
                    ) : (
                        recentLogs.map((log, index) => (
                            <React.Fragment key={log.id}>
                                <ListItem alignItems="flex-start" sx={{ px: 2, py: 1 }}>
                                    <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                                        <Avatar sx={{ width: 28, height: 28, bgcolor: log.item.includes('ลบ') ? '#fee2e2' : '#e0f2fe' }}>
                                            {log.item.includes('ลบ') ? <DeleteOutline sx={{ fontSize: 16, color: '#ef4444' }} /> : <Build sx={{ fontSize: 16, color: '#0ea5e9' }} />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText 
                                        primary={<Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>{log.item}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{log.time}</Typography>}
                                    />
                                </ListItem>
                                {index < recentLogs.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>

        </Box>
      </Box>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Box>
  );
};

export default Home;