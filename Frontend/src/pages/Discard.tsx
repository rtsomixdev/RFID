import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  IconButton, Card, CardContent, FormControl, InputLabel, Select, MenuItem, 
  Alert, Divider, Stack, Autocomplete, Chip, Tooltip, Collapse 
} from '@mui/material';
import { 
  LinkOff, PlaylistRemove, Delete, History, Search, FactCheck, 
  Build, BugReport, DeleteForever
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

interface CandidateItem {
    rfidCode: string;
    productName: string;
    status: string;
}

const Discard: React.FC = () => {
  const [reasons, setReasons] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]); 
  const [searchSelection, setSearchSelection] = useState<CandidateItem | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(''); 
  const [note, setNote] = useState('');
  const [scannedItems, setScannedItems] = useState<CandidateItem[]>([]); 
  const [deleteHistory, setDeleteHistory] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State สำหรับ Manual Troubleshoot Mode
  const [manualRfid, setManualRfid] = useState('');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
    }
    fetchReasons();
    fetchHistory();
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
      try {
          const res = await axiosClient.get('/Linen/Candidates/Discard');
          setCandidates(res.data || []);
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
          const res = await axiosClient.get('/Linen/DeleteHistory'); 
          setDeleteHistory(res.data || []);
      } catch (err) { console.error(err); }
  };

  const handleSelectItem = (item: CandidateItem | null) => {
      if (!item) return;
      if (scannedItems.find(s => s.rfidCode === item.rfidCode)) {
          Swal.fire({ icon: 'warning', title: 'รายการนี้เลือกไปแล้ว', timer: 1000, showConfirmButton: false });
          setSearchSelection(null);
          return;
      }
      setScannedItems(prev => [item, ...prev]);
      setTimeout(() => setSearchSelection(null), 100);
  };

  const handleRemoveItem = (rfid: string) => {
    setScannedItems(prev => prev.filter(item => item.rfidCode !== rfid));
  };

  // ✅ ฟังก์ชันเช็ค RFID โดยตรง (โหมดแก้ปัญหา)
  const handleManualCheck = async () => {
      if (!manualRfid) return;
      try {
          const res = await axiosClient.get(`/Linen/Check/${manualRfid.trim()}`);
          if (res.data) {
              const foundItem: CandidateItem = {
                  rfidCode: res.data.rfidCode,
                  productName: res.data.productName || "Unknown Item",
                  status: res.data.status || "Unknown"
              };
              setScannedItems(prev => {
                  if (prev.find(s => s.rfidCode === foundItem.rfidCode)) return prev;
                  return [foundItem, ...prev];
              });
              setManualRfid('');
              Swal.fire({ icon: 'success', title: 'พบข้อมูล!', text: `เจอแล้ว: ${foundItem.productName}`, timer: 1500, showConfirmButton: false });
          } else {
              Swal.fire('ไม่พบข้อมูล', 'RFID นี้ไม่มีในระบบ (Clean)', 'info');
          }
      } catch (err) {
          Swal.fire('Error', 'ไม่พบข้อมูล หรือเกิดข้อผิดพลาด', 'error');
      }
  };

  // 1. Logic หลัก: Discard & Unbind
  const handleDiscardAndUnbind = async () => {
    if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');
    if (!selectedReason) return Swal.fire('เตือน', 'กรุณาระบุสาเหตุ', 'warning');

    Swal.fire({
        title: 'ยืนยันตัดจำหน่าย?',
        html: `
            <div style="text-align: left;">
                <p>กำลังดำเนินการกับ <strong>${scannedItems.length}</strong> รายการ</p>
                <div style="background-color: #fff7ed; padding: 10px; border-radius: 6px; border: 1px solid #ffedd5; color: #9a3412;">
                    <strong>ผลลัพธ์:</strong> ผ้าจะถูกเปลี่ยนสถานะเป็น <b>Disposed</b> และ Tag จะถูกปลดล็อค (Unbind)
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        confirmButtonText: 'ยืนยัน (Reset Tag)'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Payload มาตรฐาน
                const payload = {
                    rfidCodes: scannedItems.map(i => i.rfidCode),
                    damageReasonId: parseInt(selectedReason),
                    note: note || "",
                    reportedByUserId: currentUser?.userId || 1, // Fallback ID
                    action: 'DISCARD_AND_UNBIND'
                };
                
                await axiosClient.post('/Linen/DiscardBatch', payload);
                
                Swal.fire('สำเร็จ', 'ตัดจำหน่ายและคืนค่าแท็กเรียบร้อย', 'success');
                
                const reasonName = reasons.find(r => String(r.reasonId || r.id) === selectedReason)?.reasonName || 'ไม่ระบุ';
                await sendNotification(
                    "ตัดจำหน่ายผ้า",
                    `ตัดจำหน่าย ${scannedItems.length} รายการ (สาเหตุ: ${reasonName})`,
                    "WARNING", "/discard", undefined, 1
                );

                clearForm();
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
            }
        }
    });
  };

  // 2. Logic สำรอง: Force Delete
  const handleForceDelete = async () => {
    if (scannedItems.length === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการ', 'warning');

    Swal.fire({
        title: 'ลบถาวร (Force Delete)',
        html: `<span style="color:red">ใช้แก้ปัญหา Tag ค้างเท่านั้น!</span> ข้อมูลจะหายไปจากระบบทันที`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'ลบทิ้งทันที',
        confirmButtonColor: '#d32f2f'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await axiosClient.post('/Linen/DeleteBatch', scannedItems.map(i => i.rfidCode));
                Swal.fire('ลบสำเร็จ', 'Tag ว่างพร้อมใช้งานแล้ว', 'success');
                clearForm();
            } catch (err: any) {
                Swal.fire('Error', err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
            }
        }
    });
  };

  const clearForm = () => {
      setScannedItems([]);
      setNote('');
      setSelectedReason('');
      fetchHistory();
      fetchCandidates();
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fee2e2', color: '#dc2626' }}>
            <LinkOff fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                แจ้งตัดจำหน่าย & คืนค่าแท็ก
            </Typography>
            <Typography variant="body2" color="textSecondary">
                จัดการผ้าชำรุด/สูญหาย และรีเซ็ตสถานะ Tag ให้ว่างเพื่อนำกลับมาใช้ใหม่
            </Typography>
        </Box>
      </Box>

      {/* Main Card */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
                {/* 1. Search */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>1. ค้นหา / สแกน (จากรายชื่อ)</Typography>
                    <Autocomplete
                        value={searchSelection}
                        onChange={(event, newValue) => handleSelectItem(newValue)}
                        options={candidates.filter(c => !scannedItems.find(s => s.rfidCode === c.rfidCode))} 
                        getOptionLabel={(option) => `${option.productName} (${option.rfidCode})`} 
                        autoHighlight autoSelect blurOnSelect
                        renderInput={(params) => (
                            <TextField 
                                {...params} 
                                label="ค้นหาผ้า..." 
                                placeholder="พิมพ์ชื่อ หรือยิง RFID..."
                                InputProps={{ ...params.InputProps, startAdornment: <Search color="action" sx={{ mr: 1 }} /> }}
                            />
                        )}
                        noOptionsText="ไม่พบข้อมูล (ลองใช้โหมดแก้ปัญหาด้านล่าง)"
                        fullWidth
                    />
                </Grid>

                {/* 2. Action */}
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>2. ระบุสาเหตุ</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>สาเหตุ</InputLabel>
                                <Select value={selectedReason} label="สาเหตุ" onChange={(e) => setSelectedReason(e.target.value)}>
                                    {reasons.map((r: any) => (
                                        <MenuItem key={r.reasonId || r.id} value={String(r.reasonId || r.id)}>{r.reasonName}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="หมายเหตุ" value={note} onChange={e => setNote(e.target.value)} />
                        </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                         <Button 
                            variant="contained" 
                            color="warning" 
                            startIcon={<LinkOff />}
                            onClick={handleDiscardAndUnbind} 
                            disabled={scannedItems.length === 0}
                            sx={{ fontWeight: 'bold', px: 3 }}
                        >
                            ยืนยันตัดจำหน่าย (Reset Tag)
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            {/* List Table */}
            {scannedItems.length > 0 && (
                <TableContainer sx={{ mt: 3, maxHeight: 300, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>สินค้า</TableCell>
                                <TableCell>RFID Code</TableCell>
                                <TableCell>สถานะ</TableCell>
                                <TableCell align="center">ลบ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {scannedItems.map((item, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{item.productName}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', color: '#64748b' }}>{item.rfidCode}</TableCell>
                                    <TableCell>{item.status}</TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="default" onClick={() => handleRemoveItem(item.rfidCode)}>
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

      {/* 🔥 Troubleshoot Zone */}
      <Box sx={{ mb: 3 }}>
          <Button onClick={() => setShowTroubleshoot(!showTroubleshoot)} startIcon={<Build />} sx={{ color: '#64748b' }}>
              {showTroubleshoot ? 'ซ่อนเครื่องมือแก้ปัญหา' : 'เครื่องมือแก้ปัญหา Tag ค้าง (Troubleshoot)'}
          </Button>
          <Collapse in={showTroubleshoot}>
              <Card sx={{ mt: 1, borderRadius: 3, border: '2px dashed #f87171', bgcolor: '#fef2f2' }}>
                  <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                          <BugReport color="error" />
                          <Typography variant="subtitle1" fontWeight="bold" color="#b91c1c">แก้ปัญหา Tag ค้าง / ลบไม่ออก</Typography>
                      </Stack>
                      <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                              <TextField fullWidth size="small" placeholder="ใส่รหัส RFID ที่มีปัญหาที่นี่ (เช่น E200...)" value={manualRfid} onChange={e => setManualRfid(e.target.value)} sx={{ bgcolor: '#fff' }} />
                          </Grid>
                          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1 }}>
                              <Button variant="contained" onClick={handleManualCheck} disabled={!manualRfid}>ตรวจสอบ</Button>
                              <Button variant="contained" color="error" onClick={handleForceDelete} disabled={scannedItems.length === 0} startIcon={<DeleteForever />}>ลบถาวร</Button>
                          </Grid>
                      </Grid>
                  </CardContent>
              </Card>
          </Collapse>
      </Box>
      
      {/* History */}
      <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#475569' }}>ประวัติการดำเนินการล่าสุด</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                    <TableBody>
                        {deleteHistory.map((log: any) => (
                            <TableRow key={log.id}>
                                <TableCell sx={{ color: '#334155' }}>{log.item}</TableCell>
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