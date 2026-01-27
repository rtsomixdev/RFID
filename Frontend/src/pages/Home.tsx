import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, CircularProgress, Button, Badge, List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider
} from '@mui/material';
import {
    WifiTethering, LocationOn, CheckCircle, Login, Dashboard,
    Warning, HelpOutline, History, DeleteOutline, Build, Room
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

// --- Interfaces ---
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

// --- Helper Functions ---
// Safe Date Formatter to prevent "Invalid Date"
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
                // 1. Fetch Monitor Data
                const resMonitor = await axiosClient.get('/Linen/Monitor/Latest');
                const rawData = resMonitor.data || [];

                // 2. Data Mapping (Crucial Step - FIXED HERE)
                const mappedData: MonitorItem[] = rawData.map((item: any) => {
                    // ✅ Fix Location: Check PascalCase (CurrentLocation) from C# Backend
                    const loc = item.CurrentLocation || item.currentLocation || item.current_location || item.location || item.readerLocation;

                    // ✅ Fix Time Moving Bug: REMOVED "|| new Date().toISOString()"
                    // Only use time from DB. If null, let it be null (formatDate will show '-')
                    const time = item.UpdatedAt || item.updatedAt || item.updated_at || 
                                 item.RegisteredAt || item.registeredAt || item.registered_at;

                    return {
                        rfid: item.RfidCode || item.rfidCode || item.rfid || 'Unknown ID',
                        // ✅ Fix Name: Check ItemName from C#
                        productName: item.ItemName || item.productName || item.product_name || item.item_name || 'Unknown Item',
                        location: loc || '-', 
                        status: item.Status || item.status || 'Unknown',
                        timestamp: time
                    };
                });

                // 3. Filter Data
                const unk = mappedData.filter(d =>
                    d.productName === 'Unknown' ||
                    d.productName === 'ไม่พบในระบบ' ||
                    d.status === 'Alien' ||
                    d.status === 'Disposed'
                );

                const reg = mappedData.filter(d =>
                    d.productName !== 'Unknown' &&
                    d.productName !== 'ไม่พบในระบบ' &&
                    d.status !== 'Alien' &&
                    d.status !== 'Disposed'
                );

                setRegisteredItems(reg);
                setUnknownItems(unk);
                setAllItemsCount(mappedData.length);

                // 4. Fetch Logs
                const resLogs = await axiosClient.get('/Linen/DeleteHistory');
                setRecentLogs(resLogs.data || []);

                setLoading(false);
            } catch (err) {
                console.error("Fetch Error:", err);
                setLoading(false); 
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, []);

    // Determine Latest Location for the Dashboard Card
    const latestItem = registeredItems.length > 0 ? registeredItems[0] : (unknownItems.length > 0 ? unknownItems[0] : null);
    const latestLocation = latestItem && latestItem.location !== '-' ? latestItem.location : "Waiting...";

    const getStatusColor = (status: string) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'available' || s === 'normal') return 'success';
        if (s.includes('damage') || s === 'disposed' || s === 'lost' || s === 'alien') return 'error';
        if (s === 'in use' || s === 'borrowed') return 'primary';
        if (s === 'washing' || s === 'laundry') return 'info';
        return 'warning'; // default
    };

    return (
        <Box sx={{
            height: '100vh', 
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f8fafc',
            overflow: 'hidden' 
        }}>

            {/* --- Header & Stats (Fixed Top) --- */}
            <Box sx={{ p: 3, pb: 1, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>หน้าหลัก (Monitor)</Typography>
                        <Typography variant="body1" color="text.secondary">ระบบติดตามผ้าและแจ้งเตือนวัตถุแปลกปลอม</Typography>
                    </Box>
                    <Box>
                        {!user ? (
                            <Button variant="contained" size="medium" startIcon={<Login />} onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
                        ) : (
                            <Button variant="outlined" size="medium" startIcon={<Dashboard />} onClick={() => navigate('/dashboard')}>Dashboard</Button>
                        )}
                    </Box>
                </Box>

                {/* Stat Cards Row */}
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Card sx={{ flex: 1, bgcolor: '#1e293b', color: '#fff', border: 'none', borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1 }}>READER STATUS</Typography>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <WifiTethering /> ONLINE
                                </Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(74, 222, 128, 0.2)' }}>
                                <CheckCircle sx={{ fontSize: 32, color: '#4ade80' }} />
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: 1, borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>LATEST LOCATION</Typography>
                                <Typography variant="h5" fontWeight="bold" color="text.primary" noWrap sx={{ maxWidth: 200, mt: 0.5 }}>{latestLocation}</Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(79, 70, 229, 0.1)' }}>
                                <LocationOn sx={{ fontSize: 32, color: 'primary.main' }} />
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: 1, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', boxShadow: 'none', borderRadius: 3 }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                            <Box>
                                <Typography variant="overline" color="#0369a1" fontWeight="bold" sx={{ letterSpacing: 1 }}>TOTAL SCAN</Typography>
                                <Typography variant="h5" fontWeight="bold" color="#0284c7" sx={{ mt: 0.5 }}>{allItemsCount} Items</Typography>
                            </Box>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#bae6fd' }}>
                                <Dashboard sx={{ fontSize: 32, color: '#0284c7' }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* --- Main Content Split (Flex Row) --- */}
            <Box sx={{
                flexGrow: 1,
                p: 3,
                pt: 1,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                overflow: 'hidden', 
                minHeight: 0     
            }}>

                {/* 🟢 Left: Registered Items Table */}
                <Paper sx={{
                    flex: { xs: 'none', md: 2 },
                    height: '100%', 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <Box sx={{ p: 2, px: 3, bgcolor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CheckCircle color="success" />
                            <Typography variant="h6" fontWeight="bold" color="#14532d">Registered Items</Typography>
                        </Box>
                        <Chip label={`${registeredItems.length}`} color="success" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Table stickyHeader>
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
                                    registeredItems.map((row, index) => (
                                        <TableRow key={index} hover sx={{ '& td': { py: 1.5, fontSize: '0.9rem' } }}>
                                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{formatDate(row.timestamp)}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>{row.rfid}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{row.productName}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>
                                                {row.location !== '-' && row.location ? (
                                                    <Chip icon={<Room style={{ fontSize: 14 }} />} label={row.location} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.75rem', borderColor: '#e2e8f0', bgcolor: '#fff' }} />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">-</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={row.status} size="small" color={getStatusColor(row.status) as any} sx={{ fontWeight: 600, minWidth: 80 }} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* 🔴 Right Column: Unknown & Logs */}
                <Box sx={{
                    flex: { xs: 'none', md: 1 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    overflow: 'hidden' 
                }}>

                    {/* Unknown Objects Card - Fixed Minimum Height & Scrollable */}
                    <Paper sx={{
                        flexShrink: 0, 
                        minHeight: '300px', 
                        maxHeight: '50%', 
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#fff1f2',
                        border: '1px solid #fecaca',
                        overflow: 'hidden',
                        borderRadius: 3,
                        boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.05)'
                    }}>
                        <Box sx={{ p: 2, px: 3, bgcolor: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Badge badgeContent={unknownItems.length} color="error" variant="dot">
                                    <Warning color="error" />
                                </Badge>
                                <Typography variant="h6" fontWeight="bold" color="#991b1b">Unknown Objects</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                            {unknownItems.length === 0 ? (
                                <Box sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fca5a5' }}>
                                    <CheckCircle sx={{ fontSize: 48, mb: 1.5, opacity: 0.5, alignSelf: 'center' }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Secure Area</Typography>
                                    <Typography variant="body2">No alien tags detected</Typography>
                                </Box>
                            ) : (
                                unknownItems.map((item, index) => (
                                    <Paper key={index} elevation={0} sx={{ p: 2, mb: 1.5, bgcolor: '#fff', border: '1px solid #fecaca', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 2s infinite' }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" color="error.main" sx={{ fontFamily: 'monospace', fontSize: '1rem' }}>{item.rfid}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">{formatDate(item.timestamp)}</Typography>
                                        </Box>
                                        <HelpOutline color="error" />
                                    </Paper>
                                ))
                            )}
                        </Box>
                    </Paper>

                    {/* System Activity Card - Takes Remaining Space */}
                    <Paper sx={{
                        flexGrow: 1, 
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 3,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                        <Box sx={{ p: 2, px: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                            <History color="primary" />
                            <Typography variant="h6" fontWeight="bold" color="text.primary">System Activity</Typography>
                        </Box>

                        <List sx={{ flexGrow: 1, overflowY: 'auto', py: 0 }}>
                            {recentLogs.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2">No recent activity</Typography>
                                </Box>
                            ) : (
                                recentLogs.map((log, index) => (
                                    <React.Fragment key={log.id}>
                                        <ListItem alignItems="flex-start" sx={{ px: 3, py: 1.5 }}>
                                            <ListItemAvatar sx={{ minWidth: 48 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: log.item.includes('ลบ') ? '#fee2e2' : '#e0f2fe' }}>
                                                    {log.item.includes('ลบ') ? <DeleteOutline sx={{ fontSize: 20, color: '#ef4444' }} /> : <Build sx={{ fontSize: 20, color: '#0ea5e9' }} />}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={<Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>{log.item}</Typography>}
                                                secondary={<Typography variant="caption" color="text.secondary">{log.time}</Typography>}
                                            />
                                        </ListItem>
                                        {index < recentLogs.length - 1 && <Divider component="li" variant="inset" />}
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
        /* Custom scrollbar for better look */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
        </Box>
    );
};

export default Home;