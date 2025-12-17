import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Stepper, Step, StepLabel, CircularProgress } from '@mui/material';
import { Mail, Key, LockReset, ArrowBack } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient'; // ✅ Import axiosClient

const ForgotPassword: React.FC = () => {
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
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#f1f5f9' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: '#1e293b' }}>
            ลืมรหัสผ่าน
          </Typography>
          
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {/* Step 1: Email */}
          {activeStep === 0 && (
            <Box>
              <TextField 
                fullWidth label="อีเมลของคุณ" variant="outlined" sx={{ mb: 3 }}
                value={email} onChange={(e) => setEmail(e.target.value)}
                InputProps={{ startAdornment: <Mail sx={{ color: 'text.secondary', mr: 1 }} /> }}
              />
              <Button fullWidth variant="contained" size="large" onClick={handleRequestOtp} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'ส่งรหัส OTP'}
              </Button>
            </Box>
          )}

          {/* Step 2: OTP */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                กรุณากรอกรหัส 6 หลักที่ได้รับทางอีเมล
              </Typography>
              <TextField 
                fullWidth label="รหัส OTP" variant="outlined" sx={{ mb: 3 }}
                value={otp} onChange={(e) => setOtp(e.target.value)}
                InputProps={{ startAdornment: <Key sx={{ color: 'text.secondary', mr: 1 }} /> }}
              />
              <Button fullWidth variant="contained" size="large" onClick={handleVerifyOtp} disabled={loading}>
                 {loading ? <CircularProgress size={24} /> : 'ยืนยันรหัส'}
              </Button>
            </Box>
          )}

          {/* Step 3: New Password */}
          {activeStep === 2 && (
            <Box>
              <TextField 
                fullWidth type="password" label="รหัสผ่านใหม่" variant="outlined" sx={{ mb: 3 }}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{ startAdornment: <LockReset sx={{ color: 'text.secondary', mr: 1 }} /> }}
              />
              <Button fullWidth variant="contained" color="success" size="large" onClick={handleResetPassword} disabled={loading}>
                 {loading ? <CircularProgress size={24} /> : 'บันทึกรหัสผ่านใหม่'}
              </Button>
            </Box>
          )}

          <Button startIcon={<ArrowBack />} sx={{ mt: 3 }} onClick={() => navigate('/login')}>
            กลับหน้าเข้าสู่ระบบ
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;