import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem, 
  Alert, Divider, Stack, Autocomplete 
} from '@mui/material';
import { 
  ReportProblem, DeleteForever, PlaylistRemove, Delete, History, Search 
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil'; // ✅ Import Utility

// Interface
interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Discard: React.FC = () => {
  // Master Data
  const [reasons, setReasons] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]); 
  const [searchSelection, setSearchSelection] = useState<CandidateItem | null>(null);

  // Form State
  const [selectedReason, setSelectedReason] = useState<string>(''); // ✅ Start empty
  const [note, setNote] = useState('');
  const [scannedItems, setScannedItems] = useState<CandidateItem[]>([]); 
  
  const [deleteHistory, setDeleteHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchReasons();
    fetchHistory();
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
      try {
          const res = await axiosClient.get('/Linen/Candidates/Discard');
          setCandidates(res.data);
      } catch (err) { console.error(err); }
  };

  const fetchReasons = async () => {
    try {
        const res = await axiosClient.get('/DamageReason'); 
        setReasons(res.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
      try {
          // Can use /DeleteHistory if merged, or /DiscardHistory if separated
          const res = await axiosClient.get('/Linen/DeleteHistory'); 
          setDeleteHistory(res.data);
      } catch (err) { console.error(err); }
  };

  // ✅ Item Selection (Prevents Duplicates)
  const handleSelectItem = (item: CandidateItem | null) => {
      if (!item) return;

      // 1. UI Check: Alert if duplicate
      if (scannedItems.find(s => s.rfidCode === item.rfidCode)) {
          const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
          Toast.fire({ icon: 'warning', title: 'รายการนี้เลือกไปแล้ว' });
          setSearchSelection(null);
          return;
      }

      // 2. Data Check: Double check in state update
      setScannedItems(prev => {
          if (prev.find(s => s.rfidCode === item.rfidCode)) return prev;
          return [item, ...prev];
      });
      
      setTimeout(() => setSearchSelection(null), 100);
  };

  const handleRemoveItem = (rfid: string) => {
    setScannedItems(prev => prev.filter(item => item.rfidCode !== rfid));
  };

  const handleDiscardBatch = async () => {
    if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');
    if (!selectedReason) return Swal.fire('เตือน', 'กรุณาระบุสาเหตุ', 'warning');

    Swal.fire({
        title: 'ยืนยันแจ้งชำรุด?',
        text: `ต้องการแจ้งชำรุด ${scannedItems.length} รายการ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'ยืนยัน (Discard)'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.post('/Linen/DiscardBatch', {
                    rfidCodes: scannedItems.map(i => i.rfidCode),
                    damageReasonId: parseInt(selectedReason),
                    note: note,
                    reportedByUserId: 1
                });
                Swal.fire('สำเร็จ', 'บันทึกเรียบร้อย', 'success');
                
                // 🔔 Notify Admin about damaged/lost items
                const reasonName = reasons.find(r => String(r.reasonId || r.id) === selectedReason)?.reasonName || 'ไม่ระบุสาเหตุ';
                await sendNotification(
                    "แจ้งผ้าชำรุด/สูญหาย",
                    `มีการแจ้งผ้าชำรุด/สูญหาย จำนวน ${scannedItems.length} รายการ (สาเหตุ: ${reasonName})`,
                    "WARNING", // Use Warning for damage reports
                    "/discard",
                    undefined,
                    1 // Admin
                );

                // Clear form
                setScannedItems([]);
                setNote('');
                setSelectedReason(''); 
                
                // Refresh data
                fetchHistory(); 
                fetchCandidates(); 
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.message || 'Error', 'error');
            }
        }
    });
  };

  const handleDeleteBatch = async () => {
    if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');

    Swal.fire({
        title: 'ยืนยันลบถาวร?',
        text: `ข้อมูล ${scannedItems.length} รายการจะหายไปจากระบบกู้คืนไม่ได้!`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบทิ้งทันที (Delete)'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.post('/Linen/DeleteBatch', scannedItems.map(i => i.rfidCode));
                Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบออกจากระบบ', 'success');

                // 🔔 Notify Admin about permanent deletion (High Priority)
                await sendNotification(
                    "ลบข้อมูลผ้าถาวร",
                    `มีการลบข้อมูลผ้าออกจากระบบถาวร จำนวน ${scannedItems.length} รายการ`,
                    "DANGER", // Use Danger/Error color for deletion
                    "/discard",
                    undefined,
                    1 // Admin
                );

                setScannedItems([]);
                fetchHistory();
                fetchCandidates();
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.message || 'Error', 'error');
            }
        }
    });
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fee2e2', color: '#dc2626' }}>
            <ReportProblem fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                แจ้งผ้าชำรุด / สูญหาย (Discard & Lost)
            </Typography>
            <Typography variant="body2" color="textSecondary">
                ค้นหาผ้าด้วยชื่อสินค้า หรือสแกน RFID เพื่อแจ้งชำรุด (รองรับทีละหลายรายการ)
            </Typography>
        </Box>
      </Box>

      {/* Main Input Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* Left: Scanner */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>1. เพิ่มรายการ (Search / Scan)</Typography>
                    
                    <Autocomplete
                        value={searchSelection}
                        onChange={(event, newValue) => handleSelectItem(newValue)}
                        options={candidates.filter(c => !scannedItems.find(s => s.rfidCode === c.rfidCode))} 
                        getOptionLabel={(option) => `${option.productName} (${option.rfidCode})`} 
                        
                        // ✅ Option for Scanner
                        autoHighlight 
                        autoSelect
                        blurOnSelect

                        renderInput={(params) => (
                            <TextField 
                                {...params} 
                                label="ค้นหาด้วยชื่อ หรือ สแกน RFID..." 
                                placeholder="พิมพ์ 'ปลอกหมอน' หรือยิง E200..."
                                autoFocus
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: <Search color="action" sx={{ mr: 1 }} />
                                }}
                            />
                        )}
                        noOptionsText="ไม่พบข้อมูล (หรือถูกเลือกไปแล้ว)"
                        fullWidth
                    />

                    <Box sx={{ mt: 2 }}>
                         {scannedItems.length > 0 ? (
                             <Alert severity="info" icon={<PlaylistRemove />}>
                                 รอจัดการ: <strong>{scannedItems.length}</strong> รายการ
                             </Alert>
                         ) : (
                             <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                                 ยังไม่มีรายการที่เลือก
                             </Typography>
                         )}
                    </Box>
                </Grid>

                {/* Right: Options */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>2. ระบุรายละเอียด</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="reason-label">สาเหตุความเสียหาย</InputLabel>
                                <Select 
                                    labelId="reason-label"
                                    value={selectedReason} 
                                    label="สาเหตุความเสียหาย" 
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                >
                                    {reasons.map((r: any) => (
                                        // ✅ Use String to fix selection issue
                                        <MenuItem key={r.reasonId || r.id} value={String(r.reasonId || r.id)}>
                                            {r.reasonName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth size="small" 
                                label="หมายเหตุ (Optional)" 
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button 
                            variant="outlined" color="error" startIcon={<DeleteForever />}
                            onClick={handleDeleteBatch} disabled={scannedItems.length === 0}
                            sx={{ borderRadius: 2 }}
                        >
                            ลบถาวร
                        </Button>
                        <Button 
                            variant="contained" color="warning" startIcon={<ReportProblem />}
                            onClick={handleDiscardBatch} disabled={scannedItems.length === 0}
                            sx={{ borderRadius: 2, px: 3 }}
                        >
                            แจ้งชำรุด
                        </Button>
                    </Stack>
                </Grid>
            </Grid>

            {/* List Table */}
            {scannedItems.length > 0 && (
                <TableContainer sx={{ mt: 3, maxHeight: 300, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ลำดับ</TableCell>
                                <TableCell>สินค้า</TableCell>
                                <TableCell>RFID Code</TableCell>
                                <TableCell>สถานะปัจจุบัน</TableCell>
                                <TableCell align="center">ลบ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {scannedItems.map((item, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell>{scannedItems.length - idx}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{item.productName}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', color: '#64748b' }}>{item.rfidCode}</TableCell>
                                    <TableCell>{item.status}</TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.rfidCode)}>
                                            <Delete fontSize="small"/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </CardContent>
      </Card>
      
      {/* History Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                <History color="action" />
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#475569' }}>
                    ประวัติการดำเนินการล่าสุด (History)
                </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>รายการ</TableCell>
                            <TableCell align="right">เวลา</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {deleteHistory.map((log: any) => (
                            <TableRow key={log.id}>
                                <TableCell sx={{ color: '#334155', fontWeight: 500 }}>{log.item}</TableCell>
                                <TableCell align="right" sx={{ color: '#64748b', fontSize: '0.85rem' }}>{log.time}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
      </Card>
    </Box>
  );
};

export default Discard;