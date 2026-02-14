import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Stepper, Step, StepLabel, CircularProgress, Stack, Fade, useTheme, alpha } from '@mui/material';
import { Mail, Key, LockReset, ArrowBack, VerifiedUser } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import FormLabel from '../components/ui/FormLabel';

const ForgotPassword: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = ['ระบุอีเมล', 'ยืนยัน OTP', 'ตั้งรหัสใหม่'];

  // 1. ขอ OTP
  const handleRequestOtp = async () => {
    if (!email) return Swal.fire('Error', 'กรุณากรอกอีเมล', 'error');
    setLoading(true);
    try {
      await axiosClient.post('/Auth/request-otp', { email });
      Swal.fire('สำเร็จ', `รหัส OTP ถูกส่งไปที่ ${email} แล้ว`, 'success');
      setActiveStep(1);
    } catch (error: any) {
      Swal.fire('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถส่งอีเมลได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. ยืนยัน OTP
  const handleVerifyOtp = async () => {
    if (!otp) return Swal.fire('Error', 'กรุณากรอก OTP', 'error');
    setLoading(true);
    try {
      await axiosClient.post('/Auth/verify-otp', { email, otp });
      setActiveStep(2);
    } catch (error: any) {
      Swal.fire('ผิดพลาด', error.response?.data?.message || 'OTP ไม่ถูกต้อง', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. เปลี่ยนรหัสผ่าน
  const handleResetPassword = async () => {
    if (!newPassword) return Swal.fire('Error', 'กรุณากรอกรหัสผ่านใหม่', 'error');
    setLoading(true);
    try {
      await axiosClient.post('/Auth/reset-password', { email, otp, newPassword });
      Swal.fire('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบใหม่', 'success').then(() => {
        navigate('/login');
      });
    } catch (error: any) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <Stack alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockReset sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" sx={{ color: 'text.primary' }}>
                ลืมรหัสผ่าน? (Forgot Password)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ทำตามขั้นตอนเพื่อกู้คืนรหัสผ่านของคุณ
              </Typography>
            </Box>
          </Stack>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {/* Step 1: Email */}
          {activeStep === 0 && (
            <Fade in>
              <Box>
                <FormLabel label="อีเมลของคุณ (Email Address)">
                  <TextField
                    fullWidth placeholder="name@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    InputProps={{ startAdornment: <Mail sx={{ color: 'text.secondary', mr: 1 }} /> }}
                  />
                </FormLabel>
                <Button fullWidth variant="contained" size="large" onClick={handleRequestOtp} disabled={loading} sx={{ mt: 3, py: 1.5 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'ส่งรหัส OTP (Request OTP)'}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 2: OTP */}
          {activeStep === 1 && (
            <Fade in>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, bgcolor: alpha(theme.palette.warning.main, 0.1), p: 1.5, borderRadius: 2, color: 'warning.dark' }}>
                  กรุณากรอกรหัส 6 หลักที่ได้รับทางอีเมล <strong>{email}</strong>
                </Typography>
                <FormLabel label="รหัส OTP (6 หลัก)">
                  <TextField
                    fullWidth placeholder="XXXXXX"
                    value={otp} onChange={(e) => setOtp(e.target.value)}
                    InputProps={{ startAdornment: <Key sx={{ color: 'text.secondary', mr: 1 }} /> }}
                    inputProps={{ style: { letterSpacing: 5, textAlign: 'center', fontWeight: 'bold' } }}
                  />
                </FormLabel>
                <Button fullWidth variant="contained" size="large" onClick={handleVerifyOtp} disabled={loading} sx={{ mt: 3, py: 1.5 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'ยืนยันรหัส (Verify OTP)'}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Step 3: New Password */}
          {activeStep === 2 && (
            <Fade in>
              <Box>
                <FormLabel label="รหัสผ่านใหม่ (New Password)">
                  <TextField
                    fullWidth type="password" placeholder="ตั้งรหัสผ่านใหม่..."
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    InputProps={{ startAdornment: <VerifiedUser sx={{ color: 'text.secondary', mr: 1 }} /> }}
                  />
                </FormLabel>
                <Button fullWidth variant="contained" color="success" size="large" onClick={handleResetPassword} disabled={loading} sx={{ mt: 3, py: 1.5 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'บันทึกรหัสผ่านใหม่ (Reset Password)'}
                </Button>
              </Box>
            </Fade>
          )}

          <Button startIcon={<ArrowBack />} sx={{ mt: 4 }} onClick={() => navigate('/login')}>
            กลับหน้าเข้าสู่ระบบ
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;