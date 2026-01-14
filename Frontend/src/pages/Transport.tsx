import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Grid, Paper, TextField, Button, 
  MenuItem, Select, FormControl, InputLabel, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Snackbar, Stack, Card, CardContent, Tabs, Tab, Divider, Badge,
  CircularProgress
} from '@mui/material';
import { 
  LocalShipping, QrCodeScanner, CheckCircle, ErrorOutline, 
  Delete, Send, Cancel, CallMade, CallReceived, AccessTime
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import Swal from 'sweetalert2';
import { sendNotification } from '../utils/notificationUtil'; // ✅ Import Utility

interface Reader {
  readerId: number;
  readerName: string;
  location: string;
}

interface ScannedItem {
  rfid: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const Transport: React.FC = () => {
  // State
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReader, setSelectedReader] = useState<string>('');
  const [inputRfid, setInputRfid] = useState('');
  const [scannedList, setScannedList] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for Tab (0 = Dispatch, 1 = Receive)
  const [tabValue, setTabValue] = useState(0); 

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchReaders = async () => {
      try {
        const res = await axiosClient.get('/Reader');
        setReaders(res.data);
      } catch (err) {
        console.error("Error fetching readers:", err);
      }
    };
    fetchReaders();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        // Auto focus if not typing and not loading
        if (!loading && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
             inputRef.current?.focus();
        }
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAddRfid = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRfid.trim() !== '') {
      const code = inputRfid.trim();
      // ✅ 1. Prevent duplicate scans in the same session
      if (scannedList.some(item => item.rfid === code)) {
        Swal.fire({ 
            icon: 'warning', 
            title: 'รายการซ้ำ!', 
            text: `รหัส ${code} อยู่ในรายการแล้ว`, 
            timer: 1500, 
            showConfirmButton: false 
        });
        setInputRfid('');
        return;
      }
      setScannedList(prev => [{ rfid: code, status: 'pending' }, ...prev]);
      setInputRfid('');
    }
  };

  const handleDelete = (rfid: string) => {
    setScannedList(prev => prev.filter(item => item.rfid !== rfid));
  };

  const handleClear = () => {
      setScannedList([]);
      setInputRfid('');
      inputRef.current?.focus();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setScannedList([]); 
    setInputRfid('');
  };

  // ✅ Submit Logic updated: Supports notification from Backend
  const handleSubmit = async () => {
    if (scannedList.length === 0) return;
    if (!selectedReader) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกจุดสแกน (Reader) ก่อนครับ', 'warning');
        return;
    }

    setLoading(true);
    
    try {
      const rfidsToSend = scannedList.map(item => item.rfid);
      const actionType = tabValue === 0 ? "DISPATCH" : "RECEIVE";

      const res = await axiosClient.post('/Linen/Scan', {
        rfidCodes: rfidsToSend,
        readerId: parseInt(selectedReader),
        actionType: actionType
      });

      if (!res.data || !res.data.registered) {
           throw new Error("Invalid response from server");
      }

      // ✅ 2. Receive invalid items
      const { registered, unknown, disposed, invalid } = res.data;
      
      const registeredSet = new Set(registered.map((r: any) => r.rfidCode));
      const unknownSet = new Set(unknown);
      const disposedSet = new Set(disposed.map((d: any) => d.rfidCode));
      
      const invalidMap = new Map(invalid?.map((i: any) => [i.rfidCode, i.message]) || []);

      const updatedList = scannedList.map(item => {
        if (registeredSet.has(item.rfid)) 
            return { ...item, status: 'success', message: tabValue === 0 ? 'ส่งออกสำเร็จ' : 'รับของสำเร็จ' };
        if (unknownSet.has(item.rfid)) 
            return { ...item, status: 'error', message: 'ไม่พบในระบบ' };
        if (disposedSet.has(item.rfid)) 
            return { ...item, status: 'error', message: 'จำหน่ายแล้ว' };
        if (invalidMap.has(item.rfid)) 
            return { ...item, status: 'error', message: invalidMap.get(item.rfid) }; 

        return item;
      });

      setScannedList(updatedList as ScannedItem[]);
      
      const successCount = registered.length;
      const errorCount = unknown.length + disposed.length + (invalid?.length || 0);

      // Show Summary Popup
      Swal.fire({
          icon: errorCount > 0 ? 'warning' : 'success', 
          title: tabValue === 0 ? 'ผลการส่งออก' : 'ผลการรับเข้า',
          html: `สำเร็จ: <b>${successCount}</b> รายการ<br/>ไม่ผ่าน: <b style="color:red">${errorCount}</b> รายการ`,
          timer: 3000
      });

      // ✅✅ Added section: Send Notification if there are successful items
      if (successCount > 0) {
        const currentReader = readers.find(r => r.readerId === parseInt(selectedReader));
        const locationName = currentReader ? `${currentReader.readerName} (${currentReader.location})` : 'ไม่ระบุจุด';

        if (tabValue === 0) {
            // Dispatch case -> WARNING notification (In Transit)
            // ⚠️ ระบุ roleId = 1 (Admin) เพื่อให้มั่นใจว่ามีคนได้รับแจ้งเตือนแน่นอน
            await sendNotification(
                "มีการส่งผ้าออก (Dispatch)",
                `มีการส่งผ้าจำนวน ${successCount} ชิ้น ออกจาก ${locationName}`,
                "WARNING",
                "/transport",
                undefined, 
                1 // << ส่งหา Role ID 1 (Admin)
            );
        } else {
            // Receive case -> SUCCESS notification (In Stock)
            await sendNotification(
                "รับผ้าเข้าคลังสำเร็จ (Receive)",
                `รับผ้าจำนวน ${successCount} ชิ้น เข้าสู่ ${locationName} เรียบร้อยแล้ว`,
                "SUCCESS",
                "/transport",
                undefined,
                1 // << ส่งหา Role ID 1 (Admin)
            );
        }
      }

    } catch (err: any) {
      console.error(err);
      let msg = "เกิดข้อผิดพลาดในการเชื่อมต่อ";
      if (err.response) {
          msg = `Server Error: ${err.response.status} - ${err.response.data?.message || err.message}`;
      }
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <LocalShipping sx={{ fontSize: 40, color: '#1e293b' }} />
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
              ระบบขนส่ง (Transport)
            </Typography>
            <Typography variant="body1" color="textSecondary">
              จัดการการรับ-ส่งผ้า (Dispatch & Receive)
            </Typography>
        </Box>
      </Box>

      {/* Tab Selection */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            indicatorColor={tabValue === 0 ? "primary" : "success"}
            textColor={tabValue === 0 ? "primary" : "inherit"}
          >
              <Tab 
                icon={<CallMade />} 
                label="1. ส่งของออก (DISPATCH)" 
                sx={{ 
                    color: tabValue === 0 ? '#1976d2' : 'text.secondary', 
                    fontWeight: 'bold',
                    borderBottom: tabValue === 0 ? '3px solid #1976d2' : 'none'
                }} 
              />
              <Tab 
                icon={<CallReceived />} 
                label="2. รับของเข้า (RECEIVE)" 
                sx={{ 
                    color: tabValue === 1 ? '#2e7d32' : 'text.secondary', 
                    fontWeight: 'bold',
                    borderBottom: tabValue === 1 ? '3px solid #2e7d32' : 'none'
                }}
              />
          </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Panel: Controls */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, mb: 3, borderTop: tabValue === 0 ? '5px solid #1976d2' : '5px solid #2e7d32' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom color={tabValue === 0 ? "primary" : "success.main"}>
                {tabValue === 0 ? "📤 เตรียมส่งของออก" : "📥 เตรียมรับของเข้า"}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>เลือกจุดทำงาน (Current Location)</InputLabel>
                <Select
                  value={selectedReader}
                  label="เลือกจุดทำงาน (Current Location)"
                  onChange={(e) => setSelectedReader(e.target.value)}
                >
                   <MenuItem value=""><em>-- เลือกจุดสแกน --</em></MenuItem>
                   {readers.map((r) => (
                     <MenuItem key={r.readerId} value={r.readerId}>
                        {r.readerName} ({r.location})
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>

              <Divider sx={{ mb: 2 }}>
                  <Chip label="SCAN AREA" size="small" />
              </Divider>

              <TextField
                inputRef={inputRef}
                fullWidth
                label={tabValue === 0 ? "สแกนของที่จะส่ง..." : "สแกนของที่จะรับ..."}
                variant="outlined"
                value={inputRfid}
                onChange={(e) => setInputRfid(e.target.value)}
                onKeyDown={handleAddRfid}
                placeholder="RFID Code"
                InputProps={{
                  endAdornment: <QrCodeScanner color="action" />
                }}
                sx={{ mb: 2, bgcolor: '#f8fafc' }}
                autoComplete="off"
              />
              
              <Stack direction="row" spacing={1}>
                  <Button 
                    variant="contained" 
                    color={tabValue === 0 ? "primary" : "success"}
                    fullWidth 
                    size="large" 
                    startIcon={tabValue === 0 ? <Send /> : <CheckCircle />}
                    onClick={handleSubmit}
                    disabled={loading || scannedList.length === 0}
                  >
                    {tabValue === 0 ? "ยืนยันส่งออก" : "ยืนยันรับของ"}
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleClear}
                    disabled={loading || scannedList.length === 0}
                  >
                    <Delete />
                  </Button>
              </Stack>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
              {tabValue === 0 
                ? "💡 ระบบจะเปลี่ยนสถานะผ้าเป็น 'In Transit' เพื่อรอปลายทางรับของ" 
                : "💡 ระบบจะเปลี่ยนสถานะผ้าเป็น 'Available' และย้ายตำแหน่งมาที่จุดนี้ทันที"}
          </Alert>
        </Grid>

        {/* Right Panel: List */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <Typography variant="h6" fontWeight="bold" color="text.primary">
                         รายการสแกน ({scannedList.length})
                     </Typography>
                     {tabValue === 0 
                        ? <Chip label="Mode: Dispatch" size="small" color="primary" variant="outlined" />
                        : <Chip label="Mode: Receive" size="small" color="success" variant="outlined" />
                     }
                  </Box>
                  {loading && <CircularProgress size={20} />}
              </Box>
              
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>RFID Code</TableCell>
                      <TableCell>สถานะ (Result)</TableCell>
                      <TableCell>หมายเหตุ</TableCell>
                      <TableCell align="center">ลบ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scannedList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                                <AccessTime sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                                <Typography>รอสแกน...</Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        scannedList.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{scannedList.length - index}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.rfid}</TableCell>
                            <TableCell>
                               {item.status === 'pending' && <Chip label="รอ..." size="small" />}
                               {item.status === 'success' && <Chip label="สำเร็จ" size="small" color={tabValue === 0 ? "primary" : "success"} icon={<CheckCircle />} />}
                               {item.status === 'error' && <Chip label="Error" size="small" color="error" icon={<ErrorOutline />} />}
                            </TableCell>
                            <TableCell sx={{ color: item.status === 'error' ? 'error.main' : 'text.secondary', fontSize: '0.85rem', fontWeight: item.status === 'error' ? 'bold' : 'normal' }}>
                               {item.message || '-'}
                            </TableCell>
                            <TableCell align="center">
                               {item.status === 'pending' && (
                                   <Button size="small" color="error" onClick={() => handleDelete(item.rfid)}>
                                       <Cancel fontSize="small" />
                                   </Button>
                               )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Transport;