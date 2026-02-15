import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Card, CardContent, Tabs, Tab, FormControl, InputLabel,
  Select, MenuItem, Chip, InputAdornment, Alert, Tooltip, Stack,
  useTheme, alpha
} from '@mui/material';
import {
  SettingsRemote, Tag, AddCircle, Delete, Edit, Save,
  Router, Place, AutoFixHigh, Update, SettingsInputComponent,
  RestartAlt, CheckCircle, ErrorOutline
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import axiosClient from '../api/axiosClient';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// --- Types ---
interface Reader {
  readerId: number;
  readerName: string;
  ipAddress: string;
  location: string;
  readerFunction?: string;
  isActive?: boolean;
  currentMode?: string;
  updatedAt?: string;
  status?: string;
}

interface SpecialTag {
  tagId: string;
  commandType: string;
  description: string;
  isActive?: boolean;
}

const RfidConnect: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  // --- States ---
  const [readers, setReaders] = useState<Reader[]>([]);
  const [specialTags, setSpecialTags] = useState<SpecialTag[]>([]);

  // Form States
  const [readerForm, setReaderForm] = useState({
    name: '',
    ip: '',
    location: '',
    func: 'CHECK'
  });
  const [isEditingReader, setIsEditingReader] = useState(false);
  const [editingReaderId, setEditingReaderId] = useState<number | null>(null);

  const [tagForm, setTagForm] = useState({ rfid: '', action: 'MODE_WASH', desc: '' });
  const rfidInputRef = useRef<HTMLInputElement>(null);

  // ✅ Action Options (เหลือแค่ 6 โหมดหลักตามที่ตกลง)
  const actionOptions = [
    { value: 'Normal', label: '🟢 โหมดปกติ (Tracking Only)', color: '#10b981' }, 
    { value: 'MODE_WASH', label: '🔵 โหมดส่งซัก (Send to Laundry)', color: '#3b82f6' }, 
    { value: 'MODE_RECEIVE_LAUNDRY', label: '🧺 โหมดรับผ้าเข้าโรงซัก (Receive at Laundry)', color: '#9333ea' }, 
    { value: 'MODE_RESTOCK', label: '🟡 โหมดรับคืน/เติมสต็อก (Restock)', color: '#f59e0b' }, 
    { value: 'MODE_DISCARD', label: '🔴 โหมดจำหน่าย/ทิ้ง (Discard)', color: '#ef4444' }, 
    { value: 'MODE_DISPATCH', label: '🚚 โหมดกำลังส่ง (In Transit)', color: '#0ea5e9' }, // เพิ่มใหม่
  ];

  // ✅ Initial Load & Real-time (SignalR)
  useEffect(() => {
    fetchData();

    // Polling สำรองเผื่อ SignalR หลุด
    const interval = setInterval(fetchData, 5000);

    // 🔥🔥🔥 2. Setup SignalR เพื่อรับค่า Scan แบบ Real-time 🔥🔥🔥
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5134/hubs/notification") // ตรวจสอบ Port Backend ให้ถูกต้อง
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connection.start()
      .then(() => {
        console.log("✅ SignalR Connected (RfidConnect)");

        // เมื่อมีการสแกนเกิดขึ้น (OnScan event จาก Backend)
        connection.on("OnScan", (data: any) => {
          console.log("📡 Scan Received:", data);

          // ถ้าอยู่หน้า Tab 2 (Special Tags) ให้ Auto-fill ช่อง RFID
          setTagForm(prev => ({ ...prev, rfid: data.rfid }));

          // แจ้งเตือนเล็กๆ (Toast) ว่ารับค่าแล้ว
          const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
          });
          Toast.fire({ icon: 'info', title: `รับค่า Tag: ${data.rfid}` });
        });

        // เมื่อโหมดเปลี่ยน ให้รีเฟรชตาราง Reader
        connection.on("OnModeChanged", () => {
          fetchReaders();
        });
      })
      .catch(err => console.error("❌ SignalR Connection Error: ", err));

    return () => {
      clearInterval(interval);
      connection.stop();
    };
  }, []);

  const fetchData = () => {
    fetchReaders();
    fetchSpecialTags();
  };

  const fetchReaders = async () => {
    try {
      const res = await axiosClient.get('/Reader');
      setReaders(res.data || []);
    } catch (err) { console.error("Load Readers Failed", err); }
  };

  const fetchSpecialTags = async () => {
    try {
      const res = await axiosClient.get('/SpecialTag');
      setSpecialTags(res.data || []);
    } catch (err) { console.error("Load SpecialTags Failed", err); }
  };

  // --- Handlers: Reader ---
  const handleSaveReader = async () => {
    if (!readerForm.name || !readerForm.location) {
      return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อและสถานที่ติดตั้ง', 'warning');
    }

    const payload = {
      readerName: readerForm.name,
      ipAddress: readerForm.ip || '-',
      location: readerForm.location,
      readerFunction: readerForm.func,
      isActive: true,
      currentMode: 'Normal'
    };

    try {
      if (isEditingReader && editingReaderId) {
        await axiosClient.put(`/Reader/${editingReaderId}`, { ...payload, readerId: editingReaderId });
        Swal.fire('สำเร็จ', 'อัปเดตข้อมูลแล้ว', 'success');
      } else {
        await axiosClient.post('/Reader', payload);
        Swal.fire('สำเร็จ', 'เพิ่มอุปกรณ์เรียบร้อย', 'success');
      }

      setReaderForm({ name: '', ip: '', location: '', func: 'CHECK' });
      setIsEditingReader(false);
      setEditingReaderId(null);
      fetchReaders();

    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteReader = (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "ต้องการลบอุปกรณ์นี้หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบข้อมูล'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/Reader/${id}`);
          Swal.fire('ลบแล้ว', 'ข้อมูลถูกลบเรียบร้อย', 'success');
          fetchReaders();
        } catch (err: any) {
          Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
        }
      }
    });
  };

  const handleEditClick = (r: Reader) => {
    setReaderForm({
      name: r.readerName,
      ip: r.ipAddress === '-' ? '' : r.ipAddress,
      location: r.location || '',
      func: r.readerFunction || 'CHECK'
    });
    setIsEditingReader(true);
    setEditingReaderId(r.readerId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setReaderForm({ name: '', ip: '', location: '', func: 'CHECK' });
    setIsEditingReader(false);
    setEditingReaderId(null);
  };

  // --- Remote Config Handler ---
  const handleConfigReader = (r: Reader) => {
    Swal.fire({
      title: `ตั้งค่าอุปกรณ์: ${r.readerName}`,
      html: `
        <div style="text-align:left; margin-bottom: 10px;">
          <label>คำสั่ง (Command):</label>
          <select id="swal-cmd" class="swal2-input" style="margin-top:5px;">
            <option value="CHECK_STATUS">เช็คสถานะ (Ping)</option>
            <option value="REBOOT">รีสตาร์ทเครื่อง (Reboot)</option>
            <option value="SHUTDOWN" style="color:red; font-weight:bold;">⛔ สั่งปิดเครื่อง (Shutdown)</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ส่งคำสั่ง',
      preConfirm: () => {
        const cmd = (document.getElementById('swal-cmd') as HTMLSelectElement).value;
        return { cmd };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // จำลองการส่งคำสั่ง (ในอนาคตเชื่อม API Publisher)
          Swal.fire('ส่งคำสั่งเรียบร้อย', `Command sent to ${r.readerName}`, 'success');
        } catch (err) {
          Swal.fire('Error', 'เชื่อมต่ออุปกรณ์ไม่ได้', 'error');
        }
      }
    });
  };

  // --- Handlers: Special Tag ---
  const handleAddTag = async () => {
    if (!tagForm.rfid || !tagForm.action) {
      return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาสแกน RFID และเลือกคำสั่ง', 'warning');
    }
    try {
      await axiosClient.post('/SpecialTag', {
        tagId: tagForm.rfid,
        commandType: tagForm.action,
        description: tagForm.desc,
        isActive: true
      });
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
      setTagForm({ rfid: '', action: 'MODE_WASH', desc: '' });
      setTimeout(() => rfidInputRef.current?.focus(), 100);
      fetchSpecialTags();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteTag = (id: string) => {
    Swal.fire({
      title: 'ลบ Special Tag?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบ'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosClient.delete(`/SpecialTag/${id}`);
          fetchSpecialTags();
          Swal.fire('ลบแล้ว', '', 'success');
        } catch (err) { Swal.fire('Error', 'ลบไม่สำเร็จ', 'error'); }
      }
    });
  };

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="ตั้งค่าการเชื่อมต่อ (Connect & Config)"
        subtitle="จัดการเครื่องอ่าน RFID (Readers) และกำหนดป้ายคำสั่งพิเศษ (Special Tags)"
        icon={<SettingsRemote fontSize="large" />}
        breadcrumbs={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'ตั้งค่าอุปกรณ์' }
        ]}
      />

      <Card sx={{ mb: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }} elevation={0}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.05) }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="1. จัดการอุปกรณ์ (READERS)" icon={<Router />} iconPosition="start" sx={{ fontWeight: 'bold', minHeight: 60 }} />
          <Tab label="2. SPECIAL TAGS (ป้ายคำสั่ง)" icon={<AutoFixHigh />} iconPosition="start" sx={{ fontWeight: 'bold', minHeight: 60 }} />
        </Tabs>

        {/* --- Tab 1: Readers --- */}
        <Box role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <CardContent sx={{ p: 3 }}>
              {/* Form */}
              <Grid container spacing={3} alignItems="center" sx={{ mb: 4, p: 3, bgcolor: isEditingReader ? alpha(theme.palette.warning.main, 0.05) : alpha(theme.palette.primary.main, 0.02), borderRadius: 2, border: `1px dashed ${theme.palette.divider}` }}>
                <Grid item xs={12} display="flex" alignItems="center" gap={1}>
                  {isEditingReader ? <Edit color="warning" /> : <AddCircle color="primary" />}
                  <Typography variant="subtitle2" fontWeight="bold" color={isEditingReader ? 'warning.main' : 'primary.main'}>
                    {isEditingReader ? 'แก้ไขข้อมูลอุปกรณ์' : 'เพิ่มเครื่องอ่านใหม่'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormLabel label="ชื่อจุดติดตั้ง (Reader Name)" required>
                    <TextField
                      fullWidth placeholder="ex: Reader1"
                      value={readerForm.name} onChange={e => setReaderForm({ ...readerForm, name: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Place fontSize="small" /></InputAdornment> }}
                      disabled={isEditingReader}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormLabel label="จุดติดตั้ง (Location)">
                    <TextField
                      fullWidth placeholder="เช่น หน้าห้องซัก"
                      value={readerForm.location} onChange={e => setReaderForm({ ...readerForm, location: e.target.value })}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Router fontSize="small" /></InputAdornment> }}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormLabel label="หน้าที่ (Function)">
                    <Select
                      fullWidth
                      value={readerForm.func}
                      onChange={(e) => setReaderForm({ ...readerForm, func: e.target.value })}
                      displayEmpty
                    >
                      <MenuItem value="CHECK">จุดตรวจเช็ค (Check)</MenuItem>
                      <MenuItem value="WASH">ส่งซัก (Wash)</MenuItem>
                      <MenuItem value="RECEIVE">รับผ้า (Restock)</MenuItem>
                    </Select>
                  </FormLabel>
                </Grid>

                <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {isEditingReader && (
                    <Button variant="outlined" color="inherit" onClick={handleCancelEdit}>ยกเลิก</Button>
                  )}
                  <Button
                    variant="contained"
                    color={isEditingReader ? "warning" : "primary"}
                    startIcon={isEditingReader ? <Update /> : <Save />}
                    onClick={handleSaveReader}
                    sx={{ minWidth: 150 }}
                  >
                    {isEditingReader ? 'บันทึกแก้ไข' : 'บันทึกอุปกรณ์'}
                  </Button>
                </Grid>
              </Grid>

              {/* Table */}
              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Reader Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Function</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Mode</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {readers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>ไม่พบข้อมูล Reader</TableCell></TableRow>
                    ) : readers.map((r) => (
                      <TableRow key={r.readerId} hover selected={editingReaderId === r.readerId}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{r.readerName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {r.ipAddress && r.ipAddress !== '-' ? <Chip label={r.ipAddress} size="small" variant="outlined" /> : '-'}
                        </TableCell>
                        <TableCell>{r.location || '-'}</TableCell>
                        <TableCell><Chip label={r.readerFunction || 'CHECK'} size="small" color="info" variant="outlined" /></TableCell>
                        <TableCell>
                          <Chip
                            label={r.isActive ? 'Online' : 'Offline'}
                            size="small"
                            color={r.isActive ? 'success' : 'default'}
                            variant="filled"
                            icon={r.isActive ? <CheckCircle /> : <ErrorOutline />}
                            sx={{ fontWeight: 'bold', minWidth: 90 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={r.currentMode || 'Normal'} size="small" variant="outlined" color="secondary" />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="ตั้งค่า">
                              <IconButton size="small" onClick={() => handleConfigReader(r)} sx={{ color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                <SettingsInputComponent fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="แก้ไข">
                              <IconButton size="small" color="primary" onClick={() => handleEditClick(r)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ลบ">
                              <IconButton size="small" color="error" onClick={() => handleDeleteReader(r.readerId)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}
        </Box>

        {/* --- Tab 2: Special Tags --- */}
        <Box role="tabpanel" hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <CardContent sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }} icon={<AutoFixHigh fontSize="inherit" />}>
                <strong>Special Tags คืออะไร?</strong> คือป้าย RFID พิเศษที่ใช้เป็น "คำสั่ง" สำหรับเปลี่ยนโหมดหรือสถานะผ้า
              </Alert>

              <Grid container spacing={3} alignItems="center" sx={{ mb: 4, p: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2, border: `1px solid ${theme.palette.warning.light}` }}>
                <Grid item xs={12}><Typography variant="subtitle2" fontWeight="bold" color="warning.main">ลงทะเบียนป้ายคำสั่ง</Typography></Grid>
                <Grid item xs={12} md={4}>
                  {/* 🔥🔥🔥 จุดรับค่า Auto-Fill 🔥🔥🔥 */}
                  <FormLabel label="Scan RFID Tag" required>
                    <TextField
                      inputRef={rfidInputRef}
                      fullWidth
                      placeholder="รอรับค่าจากการสแกน..."
                      value={tagForm.rfid}
                      onChange={e => setTagForm({ ...tagForm, rfid: e.target.value })}
                      autoFocus
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Tag fontSize="small" /></InputAdornment>,
                        endAdornment: tagForm.rfid ? <Chip label="Received" size="small" color="success" /> : null
                      }}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormLabel label="เลือกคำสั่ง (Action)" required>
                    <Select
                      fullWidth
                      value={tagForm.action}
                      displayEmpty
                      onChange={e => setTagForm({ ...tagForm, action: e.target.value })}
                    >
                      <MenuItem value="" disabled>เลือกคำสั่ง</MenuItem>
                      {actionOptions.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Box component="span" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: opt.color, mr: 2, display: 'inline-block' }} />
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormLabel>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormLabel label="รายละเอียดเพิ่มเติม">
                    <TextField
                      fullWidth
                      value={tagForm.desc} onChange={e => setTagForm({ ...tagForm, desc: e.target.value })}
                    />
                  </FormLabel>
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="warning" startIcon={<AddCircle />} onClick={handleAddTag} sx={{ px: 4 }}>บันทึก Special Tag</Button>
                </Grid>
              </Grid>

              <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>RFID Code</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>คำสั่ง (Action)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>รายละเอียด</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {specialTags.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>ยังไม่มี Special Tag</TableCell></TableRow>
                    ) : specialTags.map((t) => {
                      const opt = actionOptions.find(o => o.value === t.commandType);
                      return (
                        <TableRow key={t.tagId} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'warning.dark' }}>{t.tagId}</TableCell>
                          <TableCell>
                            <Chip
                              label={opt?.label || t.commandType}
                              size="small"
                              variant="outlined"
                              sx={{
                                color: opt?.color || 'grey',
                                borderColor: opt?.color || 'grey',
                                fontWeight: 'bold',
                                bgcolor: 'transparent'
                              }}
                            />
                          </TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleDeleteTag(t.tagId)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default RfidConnect;