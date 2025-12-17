import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0ea5e9', // ฟ้าสดใส (Sky Blue)
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981', // เขียว Emerald
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // สีพื้นหลังเทาอ่อนๆ สบายตา
      paper: '#ffffff',
    },
    text: {
      primary: '#334155', // เทาเข้ม
      secondary: '#64748b', // เทากลาง
    },
  },
  typography: {
    fontFamily: [
      '"Inter"',
      '"Sarabun"', // แนะนำให้ลงฟอนต์ Sarabun สำหรับภาษาไทย
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      color: '#0f172a',
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // ปุ่มมน
          textTransform: 'none', // ไม่ต้องตัวใหญ่ทั้งหมด
          fontWeight: 600,
          padding: '10px 20px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // เงา Soft
        },
      },
    },
  },
});

export default theme;