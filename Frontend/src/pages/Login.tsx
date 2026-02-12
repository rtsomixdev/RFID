import React, { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Container, Paper, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Login as LoginIcon, Visibility, VisibilityOff, Person, Lock } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 🔥 1. เปลี่ยนมาใช้ API Login โดยตรง (เพื่อให้ Backend ส่ง Permissions มาให้)
      // ส่ง username และ password ไปให้ Backend ตรวจสอบ
      const response = await axiosClient.post('/Auth/Login', {
        username: username,
        password: password
      });

      // ข้อมูลที่ได้กลับมาจะเป็นก้อนที่มี { Token: "...", User: { ..., Permissions: [...] } }
      const loginData = response.data;

      if (loginData && loginData.user) {
        // 🔥 2. บันทึกข้อมูล User ที่มี "Permissions" เข้า LocalStorage
        // ต้องเก็บ loginData.user เพราะในนั้นมี permissions อยู่
        localStorage.setItem('currentUser', JSON.stringify(loginData.user));
        
        // เก็บ Token ไว้ใช้งาน (ถ้ามี)
        if (loginData.token) {
          localStorage.setItem('token', loginData.token);
        }

        Swal.fire({
          icon: 'success', 
          title: 'ยินดีต้อนรับ', 
          text: `สวัสดีคุณ ${loginData.user.firstName}`,
          timer: 1500, 
          showConfirmButton: false
        }).then(() => {
            // ไปหน้า Dashboard
            navigate('/dashboard');
        });

        // 🔔 แจ้งเตือน Audit Log
        await sendNotification(
            "มีการเข้าสู่ระบบ (Login)",
            `ผู้ใช้งาน ${loginData.user.firstName} ${loginData.user.lastName || ''} ได้เข้าสู่ระบบสำเร็จ`,
            "INFO",
            "/dashboard",
            undefined,
            1 // แจ้งเตือนหา Admin
        );

      } else {
        Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' });
      }
    } catch (error: any) {
      console.error(error);
      // เช็คข้อความ Error จาก Backend
      const errorMsg = error.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: 'center', background: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
          <Box sx={{ width: 60, height: 60, bgcolor: 'primary.main', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', mb: 2 }}>
            <LoginIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight="800" color="primary.dark" gutterBottom>Smart Linen System</Typography>
          
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth label="ชื่อผู้ใช้งาน" margin="normal" value={username} onChange={(e) => setUsername(e.target.value)} required
              InputProps={{ startAdornment: (<InputAdornment position="start"><Person color="action" /></InputAdornment>) }}
            />
            <TextField
              fullWidth label="รหัสผ่าน" type={showPassword ? 'text' : 'password'} margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock color="action" /></InputAdornment>),
                endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>)
              }}
            />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3, mb: 2, py: 1.5 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'เข้าสู่ระบบ'}
            </Button>
            
            <Button color="primary" onClick={() => navigate('/forgot-password')}>
                ลืมรหัสผ่าน?
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};
export default Login;