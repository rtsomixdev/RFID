import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, TextField, Button,
  MenuItem, Select, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Stack, Card, CardContent, Tabs, Tab, Divider, Autocomplete,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Tooltip
} from '@mui/material';
import {
  LocalShipping, QrCodeScanner, CheckCircle, ErrorOutline,
  Delete, Send, Cancel, CallMade, CallReceived, AccessTime,
  Description, ShoppingBag
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import Swal from 'sweetalert2';
import { sendNotification } from '../utils/notificationUtil';

interface Reader {
  readerId: number;
  readerName: string;
  location: string;
}

interface ScannedItem {
  rfid: string;
  productName?: string; // เก็บชื่อสินค้าไว้โชว์
  productId?: number;   // เก็บ ID ไว้เทียบ
  status: 'pending' | 'success' | 'error';
  message?: string;
}

// ✅ อัปเดต Interface ให้รองรับรายการสินค้าข้างใน
interface RequestItem {
  requestId: number;
  requestCode: string;
  targetWard: { wardId: number; wardName: string };
  requestType: number;
  currentStatusId: number;
  requestItems: {
    id: number;
    quantity: number;
    product: {
      productId: number;
      productName: string;
      sizeSpec: string;
    };
  }[];
}

const Transport: React.FC = () => {
  // --- States ---
  const [readers, setReaders] = useState<Reader[]>([]);
  const [selectedReader, setSelectedReader] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]); // เอาไว้เทียบ RFID กับ Product

  // Request States
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  const [inputRfid, setInputRfid] = useState('');
  const [scannedList, setScannedList] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchPendingRequests();
    } else {
      setSelectedRequest(null);
    }
    setScannedList([]);
    setInputRfid('');
  }, [tabValue]);

  const fetchInitialData = async () => {
    try {
      const [readerRes, prodRes] = await Promise.all([
        axiosClient.get('/Reader'),
        axiosClient.get('/Product') // โหลด Product มาเพื่อ Map ชื่อสินค้าตอนสแกน
      ]);
      setReaders(readerRes.data);
      setProducts(prodRes.data);
      if (readerRes.data.length > 0) setSelectedReader(readerRes.data[0].readerId);
    } catch (err) { console.error(err); }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await axiosClient.get('/Request');
      // กรองเฉพาะสถานะ 2 (Approved)
      const approved = res.data.filter((r: any) => r.currentStatusId === 2);
      setPendingRequests(approved);
    } catch (err) { console.error(err); }
  };

  // 🛠️ Helper: จำลองการหา Product จาก RFID (ในระบบจริง Backend ควรบอกมา หรือเรามี Cache RFID)
  // *หมายเหตุ: ตรงนี้ถ้าไม่มี API เช็ค RFID -> Product แบบ Realtime อาจต้อง Mock หรือให้ Backend ส่งมาตอน Submit
  // แต่เพื่อให้โชว์ชื่อสินค้าได้ทันที ผมจะสมมติว่าเราเช็คจากรายการที่ขอได้
  const getProductInfoByRfidMock = (rfid: string) => {
    // ในความเป็นจริงต้องยิง API เช็ค แต่ถ้าระบบยังไม่พร้อม ส่วนนี้อาจจะปล่อยว่างชื่อสินค้าไว้ก่อน
    return { name: 'Unknown Product', id: 0 };
  };

  const handleAddRfid = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRfid.trim() !== '') {
      const code = inputRfid.trim();

      // Check Duplicate
      if (scannedList.some(item => item.rfid === code)) {
        Swal.fire({ icon: 'warning', title: 'ซ้ำ!', text: `รหัส ${code} สแกนไปแล้ว`, timer: 1000, showConfirmButton: false });
        setInputRfid('');
        return;
      }

      // 🔍 (Optional) ลองยิง API เช็คว่า RFID นี้คือสินค้าอะไร เพื่อเอามาตัดยอดโชว์
      // ถ้า Backend ยังไม่พร้อมให้เช็ครายตัว ให้ข้ามส่วนนี้ไปก่อน
      let productInfo = { name: '-', id: 0 };
      try {
        // const checkRes = await axiosClient.get(`/Linen/Check/${code}`);
        // productInfo = { name: checkRes.data.productName, id: checkRes.data.productId };
      } catch { }

      setScannedList(prev => [{ rfid: code, productName: productInfo.name, productId: productInfo.id, status: 'pending' }, ...prev]);
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

  const handleSubmit = async () => {
    if (scannedList.length === 0) return;
    if (!selectedReader) return Swal.fire('เตือน', 'กรุณาเลือกจุดสแกน (Reader)', 'warning');
    if (tabValue === 0 && !selectedRequest) return Swal.fire('เตือน', 'กรุณาเลือกใบคำร้อง', 'warning');

    setLoading(true);

    try {
      const rfidsToSend = scannedList.map(item => item.rfid);
      const actionType = tabValue === 0 ? "DISPATCH" : "RECEIVE";

      const payload = {
        rfidCodes: rfidsToSend,
        readerId: parseInt(selectedReader),
        actionType: actionType,
        requestId: selectedRequest?.requestId || null
      };

      const res = await axiosClient.post('/Linen/Scan', payload);

      if (!res.data || !res.data.registered) throw new Error("Invalid response");

      const { registered, unknown, disposed, invalid } = res.data;
      const registeredSet = new Set(registered.map((r: any) => r.rfidCode));
      const unknownSet = new Set(unknown);
      const invalidMap = new Map(invalid?.map((i: any) => [i.rfidCode, i.message]) || []);

      const updatedList = scannedList.map(item => {
        // อัปเดตชื่อสินค้าจริงจากผลลัพธ์ Server (ถ้ามีส่งกลับมา)
        const regItem = registered.find((r: any) => r.rfidCode === item.rfid);
        const realProductName = regItem?.productName || item.productName;

        if (registeredSet.has(item.rfid)) return { ...item, productName: realProductName, status: 'success', message: 'สำเร็จ' };
        if (unknownSet.has(item.rfid)) return { ...item, status: 'error', message: 'ไม่พบในระบบ' };
        if (invalidMap.has(item.rfid)) return { ...item, status: 'error', message: invalidMap.get(item.rfid) };
        return item;
      });

      setScannedList(updatedList as ScannedItem[]);

      const successCount = registered.length;

      if (successCount > 0) {
        const currentReader = readers.find(r => r.readerId === parseInt(selectedReader));
        const locationName = currentReader ? `${currentReader.readerName}` : 'Unknown';

        if (tabValue === 0) {
          await sendNotification("กำลังส่งผ้า (In Transit)", `ส่งผ้า ${successCount} ชิ้น ตามคำร้อง ${selectedRequest?.requestCode}`, "WARNING", "/transport", undefined, 1);
          fetchPendingRequests();
          setSelectedRequest(null);
        } else {
          await sendNotification("รับผ้าเข้าคลังปลายทาง", `รับผ้า ${successCount} ชิ้น เข้าสู่ ${locationName} เรียบร้อย`, "SUCCESS", "/transport", undefined, 1);
        }
      }

      Swal.fire({
        icon: successCount > 0 ? 'success' : 'warning',
        title: 'บันทึกผลการสแกน',
        text: `สำเร็จ ${successCount} รายการ`,
        timer: 1500, showConfirmButton: false
      });

    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 คำนวณยอดที่สแกนแล้ว (Mapping ด้วย Product ID หรือ Name ถ้ามี)
  // เนื่องจากตอนนี้ Client ยังไม่รู้ว่า RFID ไหนคือสินค้าอะไรเป๊ะๆ ก่อนกด Submit (เว้นแต่จะยิง API เช็คทีละตัว)
  // ส่วนนี้อาจจะโชว์ได้แค่จำนวนรวม หรือต้องรอ Backend ส่งข้อมูลกลับมา
  // แต่เพื่อ UI ที่ดี ผมจะแสดงรายการที่ต้องจัดส่งไว้ก่อน

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <LocalShipping sx={{ fontSize: 40, color: '#1e293b' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
            ระบบขนส่ง (Transport Logistics)
          </Typography>
          <Typography variant="body1" color="textSecondary">
            จัดการการรับ-ส่งผ้า ตามใบคำร้อง (Request Based)
          </Typography>
        </Box>
      </Box>

      {/* Tab Selection */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          indicatorColor={tabValue === 0 ? "primary" : "success"}
          textColor={tabValue === 0 ? "primary" : "inherit"}
        >
          <Tab icon={<CallMade />} label="1. ส่งของออก (DISPATCH)" />
          <Tab icon={<CallReceived />} label="2. รับของเข้า (RECEIVE)" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Panel: Controls */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ borderRadius: 3, mb: 3, borderTop: tabValue === 0 ? '5px solid #1976d2' : '5px solid #2e7d32', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom color={tabValue === 0 ? "primary" : "success.main"}>
                {tabValue === 0 ? "เตรียมส่งของ (ตามใบเบิก)" : "เตรียมรับของเข้า"}
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }} size="small">
                <InputLabel>จุดสแกน (Current Location)</InputLabel>
                <Select
                  value={selectedReader}
                  label="จุดสแกน (Current Location)"
                  onChange={(e) => setSelectedReader(e.target.value)}
                >
                  {readers.map((r) => (
                    <MenuItem key={r.readerId} value={r.readerId}>{r.readerName}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ✅ เลือกใบคำร้อง */}
              {tabValue === 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px dashed #bfdbfe', mb: 2 }}>
                    <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mb: 1, display: 'block' }}>
                      <Description sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      เลือกใบคำร้องที่อนุมัติแล้ว
                    </Typography>
                    <Autocomplete
                      options={pendingRequests}
                      getOptionLabel={(option) => `${option.requestCode} - ${option.targetWard?.wardName}`}
                      value={selectedRequest}
                      onChange={(e, newVal) => setSelectedRequest(newVal)}
                      size="small"
                      renderInput={(params) => (
                        <TextField {...params} label="ค้นหาใบคำร้อง..." size="small" placeholder="พิมพ์เลขที่เอกสาร" />
                      )}
                      noOptionsText="ไม่มีรายการรอส่ง"
                    />
                    {selectedRequest && (
                      <Alert severity="info" sx={{ mt: 1, py: 0, fontSize: '0.85rem' }}>
                        ปลายทาง: <strong>{selectedRequest.targetWard?.wardName}</strong>
                      </Alert>
                    )}
                  </Box>

                  {/* ✅ แสดงรายการสินค้าที่ต้องส่ง (Requirements List) */}
                  {selectedRequest && (
                    <Box sx={{ mb: 2, maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold' }}>สินค้า</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', width: 80 }}>จำนวน</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedRequest.requestItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell sx={{ fontSize: '0.85rem', maxWidth: 150 }}>
                                <Tooltip title={item.product.productName}>
                                  <Typography variant="body2" fontSize="0.85rem" noWrap>
                                    {item.product.productName}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="caption" display="block" color="textSecondary">{item.product.sizeSpec}</Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                {item.quantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Box>
              )}

              <Divider sx={{ mb: 2 }}>
                <Chip label="SCAN AREA" size="small" />
              </Divider>

              <TextField
                inputRef={inputRef}
                fullWidth
                size="small"
                label={tabValue === 0 ? "สแกนของที่จะส่ง..." : "สแกนของที่จะรับ..."}
                variant="outlined"
                value={inputRfid}
                onChange={(e) => setInputRfid(e.target.value)}
                onKeyDown={handleAddRfid}
                placeholder="RFID Code"
                InputProps={{ endAdornment: <QrCodeScanner color="action" /> }}
                sx={{ mb: 2, bgcolor: '#f8fafc' }}
                autoComplete="off"
                disabled={tabValue === 0 && !selectedRequest}
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
                <Button variant="outlined" color="error" onClick={handleClear} disabled={loading}>
                  <Delete />
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel: List */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                รายการสแกน ({scannedList.length})
              </Typography>
              {tabValue === 0
                ? <Chip label="Mode: Dispatch" size="small" color="primary" variant="outlined" />
                : <Chip label="Mode: Receive" size="small" color="success" variant="outlined" />
              }
            </Box>

            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>RFID Code</TableCell>
                    <TableCell>สินค้า (ถ้ามี)</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="center">ลบ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scannedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                        <AccessTime sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                        <Typography>
                          {tabValue === 0 && !selectedRequest ? "กรุณาเลือกใบคำร้องฝั่งซ้ายก่อน..." : "รอสแกน..."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    scannedList.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{scannedList.length - index}</TableCell>
                        <TableCell sx={{ maxWidth: 150 }}>
                          <Tooltip title={item.rfid}>
                            <Typography variant="body2" fontFamily="monospace" fontWeight="bold" noWrap>
                              {item.rfid}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, color: 'text.secondary' }}>
                          <Tooltip title={item.productName || '-'}>
                            <Typography variant="body2" noWrap>
                              {item.productName || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {item.status === 'pending' && <Chip label="รอ..." size="small" />}
                          {item.status === 'success' && <Chip label="สำเร็จ" size="small" color="success" icon={<CheckCircle />} />}
                          {item.status === 'error' && <Chip label="Error" size="small" color="error" icon={<ErrorOutline />} />}
                          {item.message && item.status === 'error' && <Typography variant="caption" color="error" display="block">{item.message}</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          {item.status === 'pending' && (
                            <Button size="small" color="error" onClick={() => handleDelete(item.rfid)}><Cancel fontSize="small" /></Button>
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