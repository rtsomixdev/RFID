import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Card, CardContent, Select, MenuItem,
  Stack, Chip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, useTheme, alpha, Divider, Tooltip, Avatar, TablePagination
} from '@mui/material';
import {
  Search, FindInPage, QrCodeScanner, Inventory2, LocalLaundryService,
  Place, CalendarToday, Visibility, Close, AccessTime, WarningAmber,
  Business, LocalHospital, Storefront
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

/**
 * โครงสร้างข้อมูลรายละเอียดของผ้า
 * @interface Linen
 */
interface Linen {
  linenId: number;
  rfidCode: string;
  product: {
    productName: string;
    sizeSpec: string;
    color: string;
    category?: { categoryName: string };
    maxWashCount?: number;
    maxLifespanDays?: number;
  };

  // ✅ แก้ไข: เพิ่ม Object Vendor และ Hospital ที่ระดับ Root (ตามที่ Backend ส่งมาหลังแก้ Include)
  vendor?: {
    vendorId: number;
    vendorName: string;
    contactName?: string;
    phone?: string
  };
  hospital?: {
    hospitalId: number;
    hospitalName: string
  };

  status: string;
  currentLocation: string;
  washCount: number;
  maxWashCount?: number;
  lastWashDate: string;
  isActive: boolean;
  registeredAt?: string;
}

/**
 * หน้าจอค้นหาข้อมูลและติดตามสถานะผ้า (Linen Search)
 */
const SearchLinen: React.FC = () => {
  const theme = useTheme();
  const [linens, setLinens] = useState<Linen[]>([]);
  const [filteredLinens, setFilteredLinens] = useState<Linen[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // สถานะสำหรับการจัดการตัวกรองการค้นหา
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // สถานะสำหรับการจัดการหน้าต่างแสดงรายละเอียดรายการ
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLinen, setSelectedLinen] = useState<Linen | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, linens]);

  // ดักจับเหตุการณ์จากการสแกน RFID (RFID Scanner Event)
  useEffect(() => {
    const handleAutoScan = (e: any) => {
      const incomingData = e.detail;
      const rfid = typeof incomingData === 'object' ? incomingData.rfid : incomingData;

      if (rfid) {
        setSearchTerm(rfid);
      }
    };

    window.addEventListener("RFID_SCANNED", handleAutoScan);
    return () => {
      window.removeEventListener("RFID_SCANNED", handleAutoScan);
    };
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [catRes, linenRes] = await Promise.all([
        axiosClient.get('/Category'),
        axiosClient.get('/Linen')
      ]);
      setCategories(catRes.data || []);
      setLinens(linenRes.data || []);
    } catch (err) {
      console.error("Error fetching search data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let results = linens;

    if (selectedCategory !== 'All') {
      results = results.filter(l => l.product?.category?.categoryName === selectedCategory);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      results = results.filter(l =>
        l.rfidCode?.toLowerCase().includes(term) ||
        l.product?.productName?.toLowerCase().includes(term) ||
        l.status?.toLowerCase().includes(term) ||
        l.currentLocation?.toLowerCase().includes(term)
      );
    }

    setFilteredLinens(results);
  };

  const handleViewDetails = (linen: Linen) => {
    setSelectedLinen(linen);
    setOpenDialog(true);
  };

  const getStatusColor = (status: string) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'available' || s === 'พร้อมใช้') return 'success';
    if (s.includes('damage') || s === 'disposed' || s.includes('จำหน่ายออก') || s.includes('ชำรุด') || s.includes('หมดอายุ')) return 'error';
    if (s === 'in use' || s === 'ถูกใช้งาน') return 'primary';
    if (s === 'washing' || s === 'กำลังซัก' || s === 'ส่งซัก' || s === 'ส่งซักซ้ำ') return 'info';
    if (s === 'dispatch' || s === 'กำลังส่ง' || s === 'ระหว่างขนส่ง') return 'warning';
    return 'default';
  };

  const calculateAgeInDays = (dateString?: string) => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="ค้นหาข้อมูลและติดตามผ้า (Linen Search)"
        subtitle="ค้นหาข้อมูลประวัติ สถานะ และตำแหน่งปัจจุบันของผ้า (รองรับการสแกน RFID)"
        icon={<FindInPage fontSize="large" />}
        breadcrumbs={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'ค้นหาข้อมูลผ้า' }
        ]}
      />

      <Card elevation={0} sx={{ mb: 4, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={6}>
              <FormLabel label="คำค้นหา (สแกน RFID / พิมพ์ชื่อผ้า / รหัสผ้า)">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="พิมพ์ค้นหา หรือ ยิงบาร์โค้ด / สแกน RFID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <QrCodeScanner color="action" sx={{ mr: 1 }} />,
                  }}
                  autoFocus
                />
              </FormLabel>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormLabel label="กรองตามหมวดหมู่">
                <Select
                  fullWidth
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="All">แสดงทั้งหมด</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.categoryId} value={c.categoryName}>{c.categoryName}</MenuItem>
                  ))}
                </Select>
              </FormLabel>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            ผลการค้นหา
          </Typography>
          <Chip label={`พบ ${filteredLinens.length} รายการ`} color="primary" sx={{ fontWeight: 'bold' }} />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>RFID Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>ชื่อสินค้า (หมวดหมู่)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สถานที่ปัจจุบัน</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>รอบซัก / อายุ (วัน)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>ดูข้อมูล</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
              ) : filteredLinens.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10, color: 'text.secondary' }}>ไม่พบข้อมูลที่ค้นหา</TableCell></TableRow>
              ) : filteredLinens.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((linen) => {
                const ageDays = calculateAgeInDays(linen.registeredAt);
                const limitDays = linen.product?.maxLifespanDays || 0;
                const limitWash = linen.maxWashCount || linen.product?.maxWashCount || 100;
                const isOverAge = limitDays > 0 && ageDays >= limitDays;
                const isOverWash = linen.washCount >= limitWash;

                return (
                  <TableRow key={linen.linenId} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontWeight="bold" color="primary.main">
                        {linen.rfidCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {linen.product?.productName || 'ไม่ระบุ'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {linen.product?.category?.categoryName || '-'} | {linen.product?.sizeSpec} | สี: {linen.product?.color}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                        <Place fontSize="small" />
                        {linen.currentLocation || 'ไม่ระบุ'}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Stack spacing={0.5} alignItems="center">
                        <Chip
                          icon={isOverWash ? <WarningAmber fontSize="small" /> : <LocalLaundryService fontSize="small" />}
                          label={`ซัก: ${linen.washCount} / ${limitWash}`}
                          size="small"
                          color={isOverWash ? "error" : "default"}
                          variant={isOverWash ? "filled" : "outlined"}
                          sx={{ fontSize: '0.75rem', height: 24, fontWeight: isOverWash ? 'bold' : 'normal' }}
                        />
                        <Chip
                          icon={isOverAge ? <WarningAmber fontSize="small" /> : <AccessTime fontSize="small" />}
                          label={`อายุ: ${ageDays} / ${limitDays > 0 ? limitDays : '-'} วัน`}
                          size="small"
                          color={isOverAge ? "error" : "default"}
                          variant={isOverAge ? "filled" : "outlined"}
                          sx={{ fontSize: '0.75rem', height: 24, fontWeight: isOverAge ? 'bold' : 'normal' }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={linen.status || 'Unknown'} size="small" color={getStatusColor(linen.status) as any} variant="filled" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="ดูประวัติและรายละเอียด">
                        <IconButton color="info" onClick={() => handleViewDetails(linen)} sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredLinens.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* --- หน้าต่าง (Dialog) แสดงรายละเอียดและประวัติของผ้า --- */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">รายละเอียดผ้า (Linen Info)</Typography>
          <IconButton onClick={() => setOpenDialog(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedLinen && (() => {
            const ageDays = calculateAgeInDays(selectedLinen.registeredAt);
            const limitDays = selectedLinen.product?.maxLifespanDays || 0;
            const limitWash = selectedLinen.maxWashCount || selectedLinen.product?.maxWashCount || 100;

            const isOverAge = limitDays > 0 && ageDays >= limitDays;
            const isOverWash = selectedLinen.washCount >= limitWash;

            return (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, textAlign: 'center', mb: 2 }}>
                    <Typography variant="overline" color="text.secondary">RFID TAG CODE</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ fontFamily: 'monospace', letterSpacing: 2 }}>
                      {selectedLinen.rfidCode}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">ชื่อสินค้า</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedLinen.product?.productName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">หมวดหมู่</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedLinen.product?.category?.categoryName || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">ขนาด</Typography>
                  <Typography variant="body2">{selectedLinen.product?.sizeSpec || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary" display="block">สี</Typography>
                  <Typography variant="body2">{selectedLinen.product?.color || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">การใช้งาน</Typography>
                  <Chip label={selectedLinen.isActive ? "Active" : "Inactive (จำหน่ายแล้ว)"} color={selectedLinen.isActive ? "success" : "error"} size="small" />
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 1, borderStyle: 'dashed' }} /></Grid>

                {/* ✅ ส่วนแสดงข้อมูลบริษัทและโรงพยาบาล (ดึงจาก Root Level) */}
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Storefront color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">บริษัทคู่ค้า (Vendor)</Typography>
                      {/* แก้ไขให้ดึงจาก selectedLinen.vendor โดยตรง */}
                      <Typography variant="body2" fontWeight="500">{selectedLinen.vendor?.vendorName || '-'}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">โรงพยาบาล (Hospital)</Typography>
                      {/* แก้ไขให้ดึงจาก selectedLinen.hospital โดยตรง */}
                      <Typography variant="body2" fontWeight="500">{selectedLinen.hospital?.hospitalName || '-'}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 1, borderStyle: 'dashed' }} /></Grid>

                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Place color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">ตำแหน่งปัจจุบัน</Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary.dark">{selectedLinen.currentLocation || 'ไม่ระบุ'}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Inventory2 color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">สถานะ</Typography>
                      <Chip label={selectedLinen.status} color={getStatusColor(selectedLinen.status) as any} size="small" sx={{ fontWeight: 'bold' }} />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalLaundryService color={isOverWash ? "error" : "action"} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">จำนวนครั้งที่ซัก</Typography>
                      <Typography variant="body1" fontWeight="bold" color={isOverWash ? 'error' : 'text.primary'}>
                        {selectedLinen.washCount} <Typography component="span" variant="caption">/ {limitWash} รอบ</Typography>
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime color={isOverAge ? "error" : "action"} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">อายุการใช้งาน (วัน)</Typography>
                      <Typography variant="body1" fontWeight="bold" color={isOverAge ? 'error' : 'text.primary'}>
                        {ageDays} <Typography component="span" variant="caption">/ {limitDays > 0 ? limitDays : '-'} วัน</Typography>
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 2, bgcolor: '#fff8f8', borderRadius: 2, border: '1px solid #ffe4e6' }}>
                    <CalendarToday color="action" fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      ลงทะเบียนเมื่อ: {selectedLinen.registeredAt ? new Date(selectedLinen.registeredAt).toLocaleString('th-TH') : '-'}
                      <br />ซักล่าสุดเมื่อ: {selectedLinen.lastWashDate ? new Date(selectedLinen.lastWashDate).toLocaleString('th-TH') : 'ยังไม่เคยซัก'}
                    </Typography>
                  </Box>
                </Grid>

              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button variant="contained" fullWidth onClick={() => setOpenDialog(false)}>ปิดหน้าต่าง</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SearchLinen;