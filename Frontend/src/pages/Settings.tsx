import React, { useEffect, useState } from "react";
import axios from "../api/axiosClient";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider,
  CircularProgress
} from "@mui/material";
import { 
  Save, 
  NotificationsActive, 
  LocalLaundryService, 
  AccessTime, 
  Chat 
} from "@mui/icons-material";

// กำหนด Key ที่เราจะใช้ในระบบ (ต้องตรงกับ Database หรือเราจะสร้างใหม่ถ้ายันไม่มี)
const DEFAULT_SETTINGS = {
  // หมวด 1: แจ้งเตือนสินค้าหมด
  LOW_STOCK_THRESHOLD: "20",       // ต่ำกว่า 20 ชิ้น ให้เตือน
  ENABLE_LOW_STOCK_ALERT: "true",  // เปิด/ปิด การเตือน

  // หมวด 2: อายุการใช้งานผ้า
  MAX_WASH_COUNT: "100",           // ซักครบ 100 ครั้ง = หมดอายุ
  MAX_FADE_DAYS: "365",            // อายุผ้า 365 วัน = หมดอายุ

  // หมวด 3: LINE Notify (เผื่ออนาคต)
  LINE_NOTIFY_TOKEN: "",           
};

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(DEFAULT_SETTINGS);

  // ดึงค่าจาก API มา Map ใส่ State
  const fetchSettings = async () => {
    try {
      const res = await axios.get("/Setting");
      const apiSettings = res.data;
      
      // แปลง Array จาก API ให้เป็น Object เพื่อใช้ง่ายๆ
      const newValues = { ...DEFAULT_SETTINGS };
      apiSettings.forEach((s: any) => {
        if (newValues.hasOwnProperty(s.key)) {
          // @ts-ignore
          newValues[s.key] = s.value;
        }
      });
      setValues(newValues);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ฟังก์ชันเปลี่ยนค่าใน Input
  const handleChange = (key: string, val: string) => {
    setValues({ ...values, [key]: val });
  };

  // ฟังก์ชันบันทึก (วนลูปยิง API Update ทีละตัว หรือสร้าง API Batch Update ก็ได้)
  const handleSave = async () => {
    setLoading(true);
    try {
      // เนื่องจากเราไม่มี API Save All ทีเดียว เราจะวนลูป Save (ใน Production ควรทำ API Batch)
      const promises = Object.entries(values).map(async ([key, value]) => {
        // เช็คก่อนว่ามี Key นี้ใน DB ไหม ถ้าไม่มีให้ Create ถ้ามีให้ Update
        // * เพื่อความง่ายใน Demo นี้ ผมจะสมมติว่ายิง Update ไปที่ Endpoint เดิม *
        // จริงๆ ควรแก้ Backend ให้มี Endpoint รับ List แต่ใช้วิธีบ้านๆ ไปก่อนครับ
        
        // หา ID ของ Setting นั้น (ต้องดึงมาใหม่ หรือ Mock logic)
        // ** วิธีที่ถูกต้องคือ Backend ควรมี Endpoint: POST /api/Setting/BatchUpdate **
        // แต่เพื่อให้โค้ดรันได้กับ Backend เดิม ผมจะใช้การ Update แบบวนลูป
        
        // 1. ดึง Setting ปัจจุบันเพื่อหา ID
        const allSettings = await axios.get("/Setting");
        const existing = allSettings.data.find((s: any) => s.key === key);

        if (existing) {
          return axios.put("/Setting/Update", { ...existing, value: value });
        } else {
          return axios.post("/Setting", { key, value, description: "Auto Gen" });
        }
      });

      await Promise.all(promises);

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการตั้งค่าเรียบร้อย',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1e293b" }}>
                ⚙️ ตั้งค่าระบบ (System Configuration)
            </Typography>
            <Typography variant="body2" color="text.secondary">
                กำหนดเงื่อนไขการแจ้งเตือน และเกณฑ์การหมดอายุของผ้า
            </Typography>
         </Box>
         <Button 
            variant="contained" 
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit"/> : <Save />}
            onClick={handleSave}
            disabled={loading}
            sx={{ height: 50, px: 4, borderRadius: 2 }}
         >
            บันทึกการตั้งค่า
         </Button>
      </Box>

      <Grid container spacing={3}>
        
        {/* Card 1: แจ้งเตือนสินค้าคงคลัง */}
        <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                    avatar={<Box sx={{ p:1, bgcolor:'#fff7ed', borderRadius:1 }}><NotificationsActive color="warning"/></Box>}
                    title={<Typography variant="h6" fontWeight="bold">การแจ้งเตือนสต็อก (Stock Alert)</Typography>}
                />
                <Divider />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={values.ENABLE_LOW_STOCK_ALERT === "true"}
                                onChange={(e) => handleChange("ENABLE_LOW_STOCK_ALERT", e.target.checked ? "true" : "false")}
                            />
                        }
                        label="เปิดใช้งานการแจ้งเตือนเมื่อของใกล้หมด"
                    />
                    
                    <TextField 
                        label="จุดแจ้งเตือนขั้นต่ำ (Threshold)"
                        type="number"
                        value={values.LOW_STOCK_THRESHOLD}
                        onChange={(e) => handleChange("LOW_STOCK_THRESHOLD", e.target.value)}
                        disabled={values.ENABLE_LOW_STOCK_ALERT === "false"}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">ชิ้น</InputAdornment>,
                        }}
                        helperText="หากผ้าชนิดใดเหลือต่ำกว่าจำนวนนี้ ระบบจะแสดงสีแดงเตือน"
                        fullWidth
                    />
                </CardContent>
            </Card>
        </Grid>

        {/* Card 2: เกณฑ์หมดอายุ */}
        <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ borderRadius: 3, height: '100%' }}>
                <CardHeader 
                    avatar={<Box sx={{ p:1, bgcolor:'#ecfdf5', borderRadius:1 }}><LocalLaundryService color="success"/></Box>}
                    title={<Typography variant="h6" fontWeight="bold">เกณฑ์การหมดอายุ (Expiration Rules)</Typography>}
                />
                <Divider />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField 
                        label="จำนวนรอบการซักสูงสุด (Max Wash Cycle)"
                        type="number"
                        value={values.MAX_WASH_COUNT}
                        onChange={(e) => handleChange("MAX_WASH_COUNT", e.target.value)}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">รอบ</InputAdornment>,
                        }}
                        helperText="หากผ้าผืนใดซักเกินจำนวนนี้ ระบบจะแจ้งเตือนให้ 'จำหน่ายออก'"
                        fullWidth
                    />

                    <TextField 
                        label="อายุการใช้งานสูงสุด (Max Age)"
                        type="number"
                        value={values.MAX_FADE_DAYS}
                        onChange={(e) => handleChange("MAX_FADE_DAYS", e.target.value)}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">วัน</InputAdornment>,
                        }}
                        helperText="นับจากวันที่ลงทะเบียนเข้าระบบ"
                        fullWidth
                    />
                </CardContent>
            </Card>
        </Grid>

        {/* Card 3: การเชื่อมต่อภายนอก */}
        <Grid item xs={12}>
            <Card elevation={3} sx={{ borderRadius: 3 }}>
                <CardHeader 
                    avatar={<Box sx={{ p:1, bgcolor:'#f0f9ff', borderRadius:1 }}><Chat color="info"/></Box>}
                    title={<Typography variant="h6" fontWeight="bold">การแจ้งเตือนผ่าน LINE (Notification)</Typography>}
                />
                <Divider />
                <CardContent>
                    <TextField 
                        label="LINE Notify Token"
                        value={values.LINE_NOTIFY_TOKEN}
                        onChange={(e) => handleChange("LINE_NOTIFY_TOKEN", e.target.value)}
                        placeholder="วาง Token ที่ได้จาก line.me ที่นี่..."
                        fullWidth
                        InputProps={{
                            startAdornment: <InputAdornment position="start">🔑</InputAdornment>,
                        }}
                        helperText={
                            <span>
                                ใส่ Token เพื่อให้ระบบส่งข้อความแจ้งเตือนเข้าไลน์กลุ่ม (
                                <a href="https://notify-bot.line.me/" target="_blank" rel="noreferrer">
                                    ขอ Token ที่นี่
                                </a>)
                            </span>
                        }
                    />
                </CardContent>
            </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Settings;