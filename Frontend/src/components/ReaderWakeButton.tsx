import React, { useState, useEffect, useRef } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { PowerSettingsNew, AccessTime } from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

interface Props {
    readerName: string;
    onWake?: () => void;
}

const ReaderWakeButton: React.FC<Props> = ({ readerName, onWake }) => {
    const [loading, setLoading] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    // สถานะปุ่ม: 'IDLE' (สีแดง) หรือ 'READY' (สีเขียว)
    const [mode, setMode] = useState<'IDLE' | 'READY'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(30);

    // Ref สำหรับ Polling
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // 1. ✅ ระบบนับถอยหลัง (Timer) ทำงานทันทีที่หน้าเว็บ ไม่ต้องรอ Server
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (mode === 'READY') {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setMode('IDLE'); // หมดเวลา -> กลับเป็นสีแดงทันที
                        return 30; // รีเซ็ตตัวเลข
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setTimeLeft(30); // ถ้าไม่ได้ใช้ ให้รีเซ็ตค่ารอไว้
        }
        return () => clearInterval(timer);
    }, [mode]);

    // 2. ✅ ระบบเช็คสถานะจริง (Polling) เผื่อ Server สั่งปิดก่อน
    useEffect(() => {
        const checkServerStatus = async () => {
            if (mode !== 'READY') return; // เช็คเฉพาะตอนที่กำลังทำงาน

            try {
                // ใช้ axiosClient ดึงข้อมูล Reader ทั้งหมด
                const res = await axiosClient.get('/Reader'); // ไม่ต้องใส่ /api เพราะ axiosClient มี baseURL แล้ว หรือถ้าไม่มีให้ใช้ Full URL
                // ถ้า axiosClient config baseURL='/api' แล้ว ให้ใช้แค่นี้
                // แต่ถ้า axiosClient config baseURL='http://localhost:5134' ให้ใช้ '/api/Reader'

                const myReader = res.data.find((r: any) => r.readerName === readerName);

                // ถ้า Server บอกว่าดับแล้ว (isActive = false) แต่หน้าเว็บยังเขียว -> สั่งแดงทันที
                if (myReader && !myReader.isActive) {
                    setMode('IDLE');
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        pollRef.current = setInterval(checkServerStatus, 3000); // เช็คทุก 3 วิ
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [readerName, mode]);

    const handleWake = async () => {
        setLoading(true);
        try {
            // ✅ ใช้ Full URL เพื่อความชัวร์ (แก้ปัญหา Error waking up)
            const fullUrl = `http://localhost:5134/api/Reader/Wake/${readerName}`;

            // ยิงคำสั่ง
            await axiosClient.post(fullUrl);

            // ✅ สั่งเปลี่ยนสีและเริ่มนับถอยหลังทันที (UX ลื่นไหล)
            setMode('READY');
            setTimeLeft(30);
            setOpenSnack(true);

            // แจ้ง Parent ว่าตื่นแล้ว
            if (onWake) onWake();

        } catch (err) {
            console.error(err);
            alert("Error waking up reader. Please check Backend connection.");
            setMode('IDLE');
        } finally {
            setLoading(false);
        }
    };

    // --- ส่วนแสดงผล ---
    if (mode === 'READY') {
        return (
            <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<AccessTime />}
                sx={{
                    borderRadius: 4,
                    fontWeight: 'bold',
                    textTransform: 'none',
                    bgcolor: 'rgba(46, 125, 50, 0.05)',
                    animation: 'pulse-green 2s infinite',
                    minWidth: '130px', // ล็อคความกว้างไม่ให้ปุ่มดิ้นตอนเลขเปลี่ยน
                    '@keyframes pulse-green': {
                        '0%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0.4)' },
                        '70%': { boxShadow: '0 0 0 10px rgba(46, 125, 50, 0)' },
                        '100%': { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)' }
                    }
                }}
            >
                Ready ({timeLeft}s)
            </Button>
        );
    }

    return (
        <>
            <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleWake}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PowerSettingsNew />}
                sx={{
                    borderRadius: 4,
                    fontWeight: 'bold',
                    minWidth: '130px',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    '&:hover': { boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)' }
                }}
            >
                {loading ? 'Waking...' : 'WAKE UP'}
            </Button>

            <Snackbar
                open={openSnack}
                autoHideDuration={2000}
                onClose={() => setOpenSnack(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled">Device Active! Ready for 30s.</Alert>
            </Snackbar>
        </>
    );
};

export default ReaderWakeButton;