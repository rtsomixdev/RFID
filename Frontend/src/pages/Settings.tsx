import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
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
  Divider
} from "@mui/material";
import { 
  Save, 
  Inventory,
  EventBusy,
  Tune,
  NotificationsActive,
  Edit,
  Close,
  CheckCircle
} from "@mui/icons-material";

const DEFAULT_GLOBAL_SETTINGS = {
  LOW_STOCK_THRESHOLD: "20",
  ENABLE_LOW_STOCK_ALERT: "true",
  ENABLE_SOUND_ALERT: "false", // Default to false since sound is removed
  ENABLE_POPUP_ALERT: "true",
};

interface ProductRule {
  productId: number;
  productName: string;
  categoryName: string;
  maxWashCount: number | string;
  maxLifespanDays: number | string;
}

const Settings = () => {
  const [loading, setLoading] = useState(false);
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
    try {
      const res = await axios.get("/Product"); 
      const productList = res.data.map((p: any) => ({
        productId: p.productId,
        productName: p.productName,
        categoryName: p.category?.categoryName || null,
        maxWashCount: p.maxWashCount || 100, 
        maxLifespanDays: p.maxLifespanDays || 365 
      }));
      setProducts(productList);
    } catch (err) {
      console.error("Error fetching products:", err);
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

  // ✅ ปรับปรุง: ยิง API บันทึกลงฐานข้อมูลทันทีที่กดยืนยันใน Popup
  const handleModalConfirm = async () => {
    if (!currentRule) return;

    // 1. ปิด Popup ก่อนเพื่อความสวยงาม
    setOpenDialog(false);

    // 2. โชว์ Loading หมุนๆ
    Swal.fire({
        title: 'กำลังบันทึก...',
        html: 'กรุณารอสักครู่ ระบบกำลังอัปเดตฐานข้อมูล',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 3. 🚀 ส่งข้อมูลไปบันทึกที่ Backend ทันที!
        await axios.put(`/Product/${currentRule.productId}`, {
            productId: currentRule.productId,
            productName: currentRule.productName,
            // แปลงค่าให้ชัวร์ว่าเป็นตัวเลข (กันส่ง string ว่าง)
            maxWashCount: parseInt(String(currentRule.maxWashCount || 0)),
            maxLifespanDays: parseInt(String(currentRule.maxLifespanDays || 0))
        });

        // 4. ถ้าผ่าน -> อัปเดตหน้าจอ (State)
        setProducts(prev => prev.map(p => 
            p.productId === currentRule.productId ? currentRule : p
        ));

        // 5. แจ้งเตือนความสำเร็จ (กลางจอ เฟี้ยวๆ)
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
        // ถ้าพัง -> แจ้งเตือนและไม่แก้หน้าจอ
        Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่',
        });
        // (Optional) อาจจะเปิด Popup กลับมาให้แก้ใหม่
        setOpenDialog(true);
    }
  };

  // --- Save All Logic ---
  const handleSave = async () => {
    setLoading(true);
    
    // โชว์หมุนๆ ตอนกด Save ใหญ่
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
            productId: p.productId,
            productName: p.productName,
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
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0', pb: 2 }}>
         <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Tune color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#1e293b" }}>
                    System Configuration
                </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
                จัดการการแจ้งเตือนและเกณฑ์อายุผ้า (รายชนิด)
            </Typography>
         </Box>
         <Button 
            variant="contained" 
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit"/> : <Save />}
            onClick={handleSave}
            disabled={loading}
            sx={{ height: 48, px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
         >
            บันทึกการตั้งค่าทั้งหมด
         </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <CardHeader 
                    avatar={<Inventory color="primary" />}
                    title={<Typography variant="h6" fontWeight={600}>Inventory Alerts</Typography>}
                    subheader="แจ้งเตือนเมื่อสต็อกต่ำ (ภาพรวม)"
                    sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                />
                <CardContent sx={{ p: 3 }}>
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={globalValues.ENABLE_LOW_STOCK_ALERT === "true"}
                                onChange={(e) => handleGlobalChange("ENABLE_LOW_STOCK_ALERT", e.target.checked ? "true" : "false")}
                                color="primary"
                            />
                        }
                        label={<Typography fontWeight={500}>เปิดใช้งานการเตือนสินค้าใกล้หมด</Typography>}
                        sx={{ mb: 3, display: 'block' }}
                    />
                    <TextField 
                        label="จุดสั่งซื้อขั้นต่ำ (Global Threshold)"
                        type="number"
                        value={globalValues.LOW_STOCK_THRESHOLD}
                        onChange={(e) => handleGlobalChange("LOW_STOCK_THRESHOLD", e.target.value)}
                        disabled={globalValues.ENABLE_LOW_STOCK_ALERT === "false"}
                        fullWidth
                        variant="outlined"
                        InputProps={{ endAdornment: <InputAdornment position="end">ชิ้น</InputAdornment> }}
                        helperText="ใช้เกณฑ์นี้ร่วมกันทุกสินค้า (ถ้าไม่ได้แยกรายตัว)"
                    />
                </CardContent>
            </Card>
        </Grid>

        <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <CardHeader 
                    avatar={<NotificationsActive color="warning" />}
                    title={<Typography variant="h6" fontWeight={600}>Web Notifications</Typography>}
                    subheader="การแจ้งเตือนบนหน้าจอ"
                    sx={{ bgcolor: '#fffbeb', borderBottom: '1px solid #fef3c7' }}
                />
                <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        {/* ❌ เอาส่วนสวิตช์เปิดปิดเสียงออก ตามที่ขอครับ */}
                        
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
                </CardContent>
            </Card>
        </Grid>

        <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardHeader 
                    avatar={<EventBusy color="error" />}
                    title={<Typography variant="h6" fontWeight={600}>Product Expiration Rules (รายชนิด)</Typography>}
                    subheader="กำหนดอายุการใช้งานของผ้าแต่ละประเภทแยกกัน (1 Type : 1 Rule)"
                    sx={{ bgcolor: '#fef2f2', borderBottom: '1px solid #fee2e2' }}
                />
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600 }}>
                        <Table stickyHeader sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fafafa' }}>ชื่อสินค้า (Product Name)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fafafa' }}>หมวดหมู่</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 180, bgcolor: '#fafafa' }}>Max Wash (รอบ)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 180, bgcolor: '#fafafa' }}>Max Age (วัน)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 100, bgcolor: '#fafafa' }}>แก้ไข</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                            <CircularProgress size={24} sx={{ mb: 1 }} />
                                            <Typography color="text.secondary">กำลังโหลดข้อมูลสินค้า...</Typography>
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
                                                    sx={{ bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}
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
                </CardContent>
            </Card>
        </Grid>

      </Grid>

      {/* Popup Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
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
                    <TextField 
                        label="จำนวนรอบการซักสูงสุด (Max Wash Cycle)"
                        type="number"
                        fullWidth
                        value={currentRule.maxWashCount}
                        onChange={(e) => handleModalChange('maxWashCount', e.target.value)}
                        InputProps={{ endAdornment: <InputAdornment position="end">รอบ</InputAdornment> }}
                        helperText="เมื่อซักครบจำนวนนี้ ระบบจะแจ้งเตือนให้จำหน่ายออก"
                    />
                    <TextField 
                        label="อายุการใช้งานสูงสุด (Max Lifespan)"
                        type="number"
                        fullWidth
                        value={currentRule.maxLifespanDays}
                        onChange={(e) => handleModalChange('maxLifespanDays', e.target.value)}
                        InputProps={{ endAdornment: <InputAdornment position="end">วัน</InputAdornment> }}
                        helperText="นับจากวันที่ลงทะเบียนเข้าระบบ"
                    />
                </Stack>
            )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#f9fafb' }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">ยกเลิก</Button>
            <Button 
                onClick={handleModalConfirm} 
                variant="contained" 
                startIcon={<CheckCircle />}
                disableElevation
            >
                ยืนยันการแก้ไข
            </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Settings;