import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Container, Paper, InputAdornment, IconButton, CircularProgress,
  CssBaseline, Link, Stack, useTheme, alpha
} from '@mui/material';
import { Visibility, VisibilityOff, PersonOutline, LockOutlined, LocalHospital } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { sendNotification } from '../utils/notificationUtil';

const Login: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosClient.post('/Auth/Login', {
        username: username,
        password: password
      });

      const loginData = response.data;

      if (loginData && loginData.user) {
        localStorage.setItem('currentUser', JSON.stringify(loginData.user));

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
          navigate('/dashboard');
        });

        await sendNotification(
          "มีการเข้าสู่ระบบ (Login)",
          `ผู้ใช้งาน ${loginData.user.firstName} ${loginData.user.lastName || ''} ได้เข้าสู่ระบบสำเร็จ`,
          "INFO",
          "/dashboard",
          undefined,
          1
        );

      } else {
        Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' });
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CssBaseline />

      {/* Decorative Background Circles */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.05) }} />
      <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.05) }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 4,
            textAlign: 'center',
            bgcolor: '#ffffff',
            boxShadow: '0 20px 40px -4px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box
            sx={{
              width: 64, height: 64,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 3
            }}
          >
            <LocalHospital sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h5" fontWeight="800" color="text.primary" gutterBottom>
            Smart Linen System
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
          </Typography>

          <form onSubmit={handleLogin}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="ชื่อผู้ใช้งาน"
                placeholder="ระบุชื่อผู้ใช้งาน"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline color="action" fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                fullWidth
                label="รหัสผ่าน"
                placeholder="ระบุรหัสผ่าน"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 3 }}>
              <Link
                component="button"
                variant="body2"
                type="button"
                onClick={() => navigate('/forgot-password')}
                underline="hover"
                sx={{ color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.85rem' }}
              >
                ลืมรหัสผ่าน?
              </Link>
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: '10px',
                bgcolor: theme.palette.primary.main,
                color: '#fff',
                fontSize: '1rem',
                boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.5)}`,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                  boxShadow: `0 12px 20px -4px ${alpha(theme.palette.primary.main, 0.6)}`,
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          <Typography variant="caption" display="block" sx={{ mt: 4, color: theme.palette.text.disabled }}>
            © {new Date().getFullYear()} Smart Linen Management System
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;