import React, { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Container, Paper, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Login as LoginIcon, Visibility, VisibilityOff, Person, Lock } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

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
      // ดึง User ทั้งหมดมาเช็ค (ถ้ามี API Login โดยเฉพาะ ให้เปลี่ยนไปใช้ endpoint นั้น)
      const response = await axiosClient.get('/User');
      const users = response.data;
      
      const user = users.find((u: any) => u.username === username && u.passwordHash === password);

      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        Swal.fire({
          icon: 'success', title: 'ยินดีต้อนรับ', text: `สวัสดีคุณ ${user.firstName}`,
          timer: 1500, showConfirmButton: false
        }).then(() => navigate('/dashboard'));
      } else {
        Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อ Server ได้' });
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
            
            {/* ✅ ปุ่มลืมรหัสผ่าน */}
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