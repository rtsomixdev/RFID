import React, { useState, useEffect, useRef } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Tooltip, Box } from '@mui/material';
import {
    PowerSettingsNew,
    AccessTime,
    Lock,
    WifiOff,
    Nfc
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

/**
 * คุณสมบัติปุ่มสั่งการทำงานของเครื่องอ่าน RFID
 * @interface Props
 * @property {string} readerName ชื่อเครื่องอ้างอิง
 * @property {function} [onWake] เหตุการณ์หลังปลุกสำเร็จ
 */
interface Props {
    readerName: string;
    onWake?: () => void;
}

type ButtonState = 'LOADING' | 'OFFLINE' | 'LOCKED' | 'IDLE' | 'READY';

/**
 * คอมโพเนนต์ปุ่มกดสั่งปลุกเครื่องอ่าน RFID (Wake)
 * คอยรับสถานะแบบเรียงเวลาจากฐานข้อมูลและตัดสินใจความพร้อมก่อนให้ผู้ใช้งานกดปลุก
 * รวมถึงจำลองการนับถอยหลังภายในเพื่อให้ปุ่มตอบสนองเร็วขึ้น (Optimistic UI) 
 * * @param {Props} props ข้อมูลชื่อและฟังก์ชันของปุ่ม
 * @returns {JSX.Element} เลย์เอาท์ปุ่มพร้อมลูกเล่นต่างๆ แบ่งตามตรรกะสถานะเครื่อง
 */
const ReaderWakeButton: React.FC<Props> = ({ readerName, onWake }) => {
    const [loading, setLoading] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    const [uiState, setUiState] = useState<ButtonState>('LOADING');
    const [timeLeft, setTimeLeft] = useState(30);

    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const isWakingRef = useRef<boolean>(false);

    // ประเมินเวลาทำการปัจจุบันตรงกับตารางของเซิร์ฟเวอร์หรือไม่
    const checkIsOperatingTime = (reader: any) => {
        if (!reader.operatingStartTime || !reader.operatingEndTime || !reader.operatingDays) {
            return true;
        }

        const now = new Date();
        const day = now.getDay();

        if (reader.operatingDays === 'Mon-Fri' && (day === 0 || day === 6)) {
            return false;
        }

        const currentTimeStr = now.toTimeString().substring(0, 8);
        const start = reader.operatingStartTime;
        const end = reader.operatingEndTime;

        if (start <= end) {
            return currentTimeStr >= start && currentTimeStr <= end;
        } else {
            return currentTimeStr >= start || currentTimeStr <= end;
        }
    };

    // ฟังก์ชันดึงข้อมูลสถานะล่าสุดจาก API
    const fetchStatus = async () => {
        try {
            const res = await axiosClient.get('/Reader');
            const myReader = res.data.find((r: any) => r.readerName === readerName);

            if (!myReader || !myReader.isActive) {
                setUiState('OFFLINE');
                return;
            }

            if (!checkIsOperatingTime(myReader)) {
                setUiState('LOCKED');
                return;
            }

            // ถ้าระบบกำลังส่งคำสั่งปลุกอยู่ ให้ข้ามการอัปเดตไปก่อน เพื่อกันปุ่มกระพริบ
            if (isWakingRef.current) return;

            if (myReader.currentMode === 'โหมดหลับ (SLEEP)' || myReader.currentMode === 'SLEEP') {
                setUiState('IDLE');
            } else {
                setUiState('READY');
            }
        } catch (err) {
            console.error("Polling error", err);
        }
    };

    // หมั่นดึงสถานะเครื่องอ่าน RFID และดักฟัง Event จาก SignalR
    useEffect(() => {
        fetchStatus();
        pollRef.current = setInterval(fetchStatus, 3000);

        // ✅ ฟังก์ชันรับสัญญาณจาก SignalR (ผ่าน App.tsx) เมื่อเครื่องอ่านเข้าโหมด Sleep หรือ Wake
        const handleModeChange = (e: any) => {
            const mode = e.detail?.mode || e.detail?.currentMode;
            if (mode === 'SLEEP' || mode === 'โหมดหลับ (SLEEP)') {
                setUiState('IDLE');
                setTimeLeft(30);
            } else {
                setUiState('READY');
            }
            fetchStatus(); // เรียกดึงข้อมูลยืนยันอีกครั้ง
        };

        window.addEventListener("MODE_CHANGED", handleModeChange);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            window.removeEventListener("MODE_CHANGED", handleModeChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readerName]);

    // จับเวลานับถอยหลังหลอกบนหน้าบ้าน 30 วินาที
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (uiState === 'READY') {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setUiState('IDLE'); // หมดเวลา ปรับสถานะเป็น IDLE อัตโนมัติ
                        return 30;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setTimeLeft(30);
        }
        return () => clearInterval(timer);
    }, [uiState]);

    // ดำเนินการกดปลุกและส่งคำสั่งผ่าน API
    const handleWake = async () => {
        if (uiState === 'LOCKED' || uiState === 'OFFLINE') return;

        setLoading(true);
        isWakingRef.current = true; // ป้องกันการดึงสถานะรบกวนระหว่างเปลี่ยนโหมด
        try {
            await axiosClient.post(`/Reader/Wake/${readerName}`);

            // หลอกเปลี่ยนโหมดหน้าปุ่มล่วงหน้าทันทีเพื่อตอบสนองฉับไว
            setUiState('READY');
            setTimeLeft(30);
            setOpenSnack(true);

            if (onWake) onWake();
        } catch (err) {
            console.error(err);
            setUiState('LOCKED');
        } finally {
            setLoading(false);
            // หน่วงเวลาปลดล็อคการดึงสถานะ 2 วินาที
            setTimeout(() => {
                isWakingRef.current = false;
            }, 2000);
        }
    };

    if (uiState === 'LOADING') {
        return <Button disabled variant="outlined" sx={{ minWidth: 140, borderRadius: 4 }}><CircularProgress size={20} /></Button>;
    }

    if (uiState === 'OFFLINE') {
        return (
            <Tooltip title="อุปกรณ์ออฟไลน์ หรือไม่ได้เปิดเครื่อง">
                <span>
                    <Button disabled variant="contained" startIcon={<WifiOff />} sx={{ minWidth: 140, borderRadius: 4, bgcolor: '#e2e8f0', color: '#94a3b8' }}>
                        OFFLINE
                    </Button>
                </span>
            </Tooltip>
        );
    }

    if (uiState === 'LOCKED') {
        return (
            <Tooltip title="อยู่นอกเวลาทำงาน (Lockdown) ไม่สามารถใช้งานได้">
                <span>
                    <Button disabled variant="contained" startIcon={<Lock />} sx={{ minWidth: 140, borderRadius: 4, bgcolor: '#334155', color: '#cbd5e1', '&.Mui-disabled': { bgcolor: '#475569', color: '#94a3b8' } }}>
                        LOCKED
                    </Button>
                </span>
            </Tooltip>
        );
    }

    if (uiState === 'READY') {
        return (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Button
                    variant="outlined"
                    color="success"
                    startIcon={<Nfc />}
                    sx={{
                        borderRadius: 4,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        bgcolor: 'rgba(46, 125, 50, 0.05)',
                        animation: 'pulse-green 1.5s infinite',
                        minWidth: 140,
                        borderWidth: 2,
                        '&:hover': { borderWidth: 2 },
                        '@keyframes pulse-green': {
                            '0%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.4)' },
                            '70%': { boxShadow: '0 0 0 8px rgba(46, 125, 50, 0)' },
                            '100%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)' }
                        }
                    }}
                >
                    พร้อมสแกน ({timeLeft}s)
                </Button>
            </Box>
        );
    }

    return (
        <>
            <Tooltip title="คลิกเพื่อปลุกเครื่องให้พร้อมสแกน RFID (ทำงาน 30 วินาที)">
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleWake}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PowerSettingsNew />}
                    sx={{
                        borderRadius: 4,
                        fontWeight: 'bold',
                        minWidth: 140,
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.6)',
                            transform: 'translateY(-2px)'
                        }
                    }}
                >
                    {loading ? 'WAKING...' : 'WAKE UP'}
                </Button>
            </Tooltip>

            <Snackbar
                open={openSnack}
                autoHideDuration={2000}
                onClose={() => setOpenSnack(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" sx={{ borderRadius: 3 }}>
                    🟢 อุปกรณ์พร้อมทำงาน! กรุณาสแกนภายใน 30 วินาที
                </Alert>
            </Snackbar>
        </>
    );
};

export default ReaderWakeButton;