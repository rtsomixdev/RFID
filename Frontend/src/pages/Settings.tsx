import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  alpha
} from "@mui/material";
import {
  Save,
  Inventory,
  EventBusy,
  NotificationsActive,
  Edit,
  Close,
  CheckCircle,
  SettingsSuggest
} from "@mui/icons-material";
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

const DEFAULT_GLOBAL_SETTINGS = {
  LOW_STOCK_THRESHOLD: "20",
  ENABLE_LOW_STOCK_ALERT: "true",
  ENABLE_SOUND_ALERT: "false",
  ENABLE_POPUP_ALERT: "true",
};

interface ProductRule {
  productId: number;
  productName: string;
  categoryName: string;
  maxWashCount: number | string;
  maxLifespanDays: number | string;
  rawProduct: any; 
}

const Settings = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true); // ✅ เพิ่ม State ไว้จัดการวงล้อโหลดแยกต่างหาก
  const [globalValues, setGlobalValues] = useState(DEFAULT_GLOBAL_SETTINGS);
  const [products, setProducts] = useState<ProductRule[]>([]);

  // State สำหรับ Popup
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRule, setCurrentRule] = useState<ProductRule | null>(null);

  useEffect(() => {
    fetchGlobalSettings();
    fetchProducts();
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      const res = await axios.get("/Setting");
      const apiSettings = res.data;
      const newValues = { ...DEFAULT_GLOBAL_SETTINGS };
      apiSettings.forEach((s: any) => {
        if (newValues.hasOwnProperty(s.key)) {
          // @ts-ignore
          newValues[s.key] = s.value;
        }
      });
      setGlobalValues(newValues);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setIsFetchingProducts(true); // ✅ เริ่มโหลด
    try {
      const res = await axios.get("/Product");
      const productList = res.data.map((p: any) => ({
        productId: p.productId,
        productName: p.productName,
        categoryName: p.category?.categoryName || null,
        maxWashCount: p.maxWashCount || 100,
        maxLifespanDays: p.maxLifespanDays || 365,
        rawProduct: p 
      }));
      setProducts(productList);
    } catch (err) {
      console.error("Error fetching products:", err);
      // ไม่ต้อง Alert ก็ได้เดี๋ยว User ตกใจ ให้มันโชว์ในตารางว่าไม่พบข้อมูล
    } finally {
      setIsFetchingProducts(false); // ✅ โหลดเสร็จแล้ว (ไม่ว่าจะสำเร็จหรือ Error ก็ให้หยุดหมุน)
    }
  };

  const handleGlobalChange = (key: string, val: string) => {
    setGlobalValues({ ...globalValues, [key]: val });
  };

  // --- Modal Logic ---
  const handleEditClick = (rule: ProductRule) => {
    setCurrentRule({ ...rule });
    setOpenDialog(true);
  };

  const handleModalChange = (field: keyof ProductRule, val: string) => {
    if (!currentRule) return;
    if (val === "") {
      setCurrentRule({ ...currentRule, [field]: "" });
      return;
    }
    const num = parseInt(val);
    if (!isNaN(num)) {
      setCurrentRule({ ...currentRule, [field]: num });
    }
  };

  const handleModalConfirm = async () => {
    if (!currentRule) return;

    setOpenDialog(false);

    Swal.fire({
      title: 'กำลังบันทึก...',
      html: 'กรุณารอสักครู่ ระบบกำลังอัปเดตฐานข้อมูล',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const payload = {
        ...currentRule.rawProduct, 
        maxWashCount: parseInt(String(currentRule.maxWashCount || 0)),
        maxLifespanDays: parseInt(String(currentRule.maxLifespanDays || 0))
      };

      await axios.put(`/Product/${currentRule.productId}`, payload);

      setProducts(prev => prev.map(p =>
        p.productId === currentRule.productId ? { ...currentRule, rawProduct: payload } : p
      ));

      Swal.fire({
        icon: 'success',
        title: 'บันทึกเรียบร้อย!',
        text: `ข้อมูลของ "${currentRule.productName}" ถูกแก้ไขลงฐานข้อมูลแล้ว`,
        timer: 1500,
        showConfirmButton: false,
        position: 'center',
        backdrop: `rgba(0,0,123,0.1)`
      });

    } catch (err: any) {
      console.error("Save Error:", err);
      Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่',
      });
      setOpenDialog(true);
    }
  };

  // --- Save All Logic ---
  const handleSave = async () => {
    setLoading(true);

    Swal.fire({
      title: 'กำลังบันทึกการตั้งค่าทั้งหมด...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const settingPromises = Object.entries(globalValues).map(async ([key, value]) => {
        const allSettings = await axios.get("/Setting");
        const existing = allSettings.data.find((s: any) => s.key === key);
        if (existing) {
          return axios.put("/Setting/Update", { ...existing, value: value });
        } else {
          return axios.post("/Setting", { key, value, description: "System Config" });
        }
      });

      const productPromises = products.map(p =>
        axios.put(`/Product/${p.productId}`, {
          ...p.rawProduct,
          maxWashCount: parseInt(String(p.maxWashCount || 0)),
          maxLifespanDays: parseInt(String(p.maxLifespanDays || 0))
        })
      );

      await Promise.all([...settingPromises, ...productPromises]);

      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลทั้งหมดเรียบร้อย',
        text: 'ระบบอัปเดตการตั้งค่าลงฐานข้อมูลแล้ว',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeader
        title="ตั้งค่าระบบ (System Configuration)"
        subtitle="จัดการการแจ้งเตือนและเกณฑ์อายุผ้า (รายชนิด)"
        icon={<SettingsSuggest fontSize="large" />}
        breadcrumbs={[
          { label: 'หน้าหลัก', href: '/' },
          { label: 'ตั้งค่า' }
        ]}
        action={
          <Button
            variant="contained"
            size="medium"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={loading}
            sx={{ px: 3 }}
          >
            บันทึกทั้งหมด
          </Button>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}><Inventory color="primary" /></Paper>
              <Box>
                <Typography variant="h6" fontWeight={600}>Inventory Alerts</Typography>
                <Typography variant="body2" color="text.secondary">แจ้งเตือนเมื่อสต็อกต่ำ (ภาพรวม)</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={globalValues.ENABLE_LOW_STOCK_ALERT === "true"}
                    onChange={(e) => handleGlobalChange("ENABLE_LOW_STOCK_ALERT", e.target.checked ? "true" : "false")}
                    color="primary"
                  />
                }
                label={<Typography fontWeight={500}>เปิดใช้งานการเตือนสินค้าใกล้หมด</Typography>}
                sx={{ mb: 3 }}
              />
              <FormLabel label="จุดสั่งซื้อขั้นต่ำ (Global Threshold)">
                <TextField
                  type="number"
                  value={globalValues.LOW_STOCK_THRESHOLD}
                  onChange={(e) => handleGlobalChange("LOW_STOCK_THRESHOLD", e.target.value)}
                  disabled={globalValues.ENABLE_LOW_STOCK_ALERT === "false"}
                  fullWidth
                  size="medium"
                  InputProps={{ endAdornment: <InputAdornment position="end">ชิ้น</InputAdornment> }}
                  helperText="ใช้เกณฑ์นี้ร่วมกันทุกสินค้า (ถ้าไม่ได้แยกรายตัว)"
                />
              </FormLabel>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}><NotificationsActive color="warning" /></Paper>
              <Box>
                <Typography variant="h6" fontWeight={600}>Web Notifications</Typography>
                <Typography variant="body2" color="text.secondary">การแจ้งเตือนบนหน้าจอ</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalValues.ENABLE_POPUP_ALERT === "true"}
                      onChange={(e) => handleGlobalChange("ENABLE_POPUP_ALERT", e.target.checked ? "true" : "false")}
                      color="warning"
                    />
                  }
                  label={
                    <Box>
                      <Typography fontWeight={500}>หน้าต่างแจ้งเตือน (Popup Dialog)</Typography>
                      <Typography variant="caption" color="text.secondary">แสดง Popup สรุปผลเมื่อทำรายการสำเร็จ</Typography>
                    </Box>
                  }
                />
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ gridColumn: 'span 12' }}>
          <Paper variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}><EventBusy color="error" /></Paper>
              <Box>
                <Typography variant="h6" fontWeight={600}>Product Expiration Rules</Typography>
                <Typography variant="body2" color="text.secondary">กำหนดอายุการใช้งานของผ้าแต่ละประเภทแยกกัน (1 Type : 1 Rule)</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 0 }}>
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600 }}>
                <Table stickyHeader sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>ชื่อสินค้า (Product Name)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>หมวดหมู่</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 180, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Max Wash (รอบ)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 180, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Max Age (วัน)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', width: 100, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>แก้ไข</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* ✅ แก้ไขเงื่อนไขการโหลดตรงนี้ */}
                    {isFetchingProducts ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                          <CircularProgress size={24} sx={{ mb: 1 }} />
                          <Typography color="text.secondary">กำลังโหลดข้อมูลสินค้า...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                          <Typography color="error">ไม่พบข้อมูลสินค้า (เซิร์ฟเวอร์อาจเกิดปัญหา กรุณาตรวจสอบ Backend)</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((row) => (
                        <TableRow key={row.productId} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{row.productName}</TableCell>
                          <TableCell>
                            {row.categoryName && row.categoryName !== "-" ? (
                              <Chip label={row.categoryName} size="small" variant="outlined" />
                            ) : (
                              <Typography variant="caption" color="text.disabled">ไม่ระบุ</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={`${row.maxWashCount} รอบ`} color="primary" variant="outlined" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={`${row.maxLifespanDays} วัน`} color="error" variant="outlined" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              onClick={() => handleEditClick(row)}
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                              size="small"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Box>
      </Box >

      {/* Popup Dialog */}
      < Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight="bold">แก้ไขเกณฑ์สินค้า</Typography>
          <IconButton onClick={() => setOpenDialog(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {currentRule && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">ชื่อสินค้า</Typography>
                <Typography variant="h6" color="primary">{currentRule.productName}</Typography>
              </Box>
              <Divider />
              <FormLabel label="จำนวนรอบการซักสูงสุด (Max Wash Cycle)">
                <TextField
                  type="number"
                  fullWidth
                  value={currentRule.maxWashCount}
                  onChange={(e) => handleModalChange('maxWashCount', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">รอบ</InputAdornment> }}
                  helperText="เมื่อซักครบจำนวนนี้ ระบบจะแจ้งเตือนให้จำหน่ายออก"
                />
              </FormLabel>
              <FormLabel label="อายุการใช้งานสูงสุด (Max Lifespan)">
                <TextField
                  type="number"
                  fullWidth
                  value={currentRule.maxLifespanDays}
                  onChange={(e) => handleModalChange('maxLifespanDays', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">วัน</InputAdornment> }}
                  helperText="นับจากวันที่ลงทะเบียนเข้าระบบ"
                />
              </FormLabel>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.action.hover, 0.1) }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" size="large">ยกเลิก</Button>
          <Button
            onClick={handleModalConfirm}
            variant="contained"
            startIcon={<CheckCircle />}
            disableElevation
            size="large"
          >
            ยืนยันการแก้ไข
          </Button>
        </DialogActions>
      </Dialog >

    </Box >
  );
};

export default Settings;