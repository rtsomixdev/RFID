import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { PowerSettingsNew, CheckCircle } from '@mui/icons-material';
import axiosClient from '../api/axiosClient';

interface Props {
    readerName: string;
    isOnline: boolean;
}

const ReaderWakeButton: React.FC<Props> = ({ readerName, isOnline }) => {
    const [loading, setLoading] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    const handleWake = async () => {
        setLoading(true);
        try {
            // ยิง API ปลุกเครื่อง
            await axiosClient.post(`/Reader/Wake/${readerName}`);
            setOpenSnack(true);
        } catch (err) {
            console.error(err);
            alert("Error waking up reader");
        } finally {
            setLoading(false);
        }
    };

    if (isOnline) {
        return (
            <Button 
                variant="outlined" 
                color="success" 
                size="small" 
                startIcon={<CheckCircle />}
                sx={{ borderRadius: 4, fontWeight: 'bold', textTransform: 'none' }}
            >
                Ready (30s)
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
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                        '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
                        '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
                        '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' }
                    }
                }}
            >
                {loading ? 'Waking...' : 'WAKE UP'}
            </Button>

            <Snackbar open={openSnack} autoHideDuration={2000} onClose={() => setOpenSnack(false)}>
                <Alert severity="success">Device Active! Timer reset to 30s.</Alert>
            </Snackbar>
        </>
    );
};

export default ReaderWakeButton;