import React, { useEffect, useState } from 'react';
import axios from '../api/axiosClient';
import { Box, Typography, Paper, List, ListItem, ListItemAvatar, Avatar, ListItemText, Chip, Divider } from '@mui/material';
import { CheckCircle, Warning, Info, NotificationsActive } from '@mui/icons-material';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    
    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        if(user) {
            axios.get(`/Notification/MyNotifications?userId=${user.userId}&roleId=${user.roleId}`)
                .then(res => setNotifications(res.data.notifications));
        }
    }, []);

    const getIcon = (type: string) => {
        if (type === 'SUCCESS') return <CheckCircle color="success" />;
        if (type === 'WARNING') return <Warning color="warning" />;
        return <Info color="info" />;
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                🔔 รายการแจ้งเตือนทั้งหมด
            </Typography>
            
            <Paper sx={{ borderRadius: 3 }}>
                <List>
                    {notifications.map((noti, index) => (
                        <React.Fragment key={noti.id}>
                            <ListItem alignItems="flex-start" sx={{ bgcolor: noti.isRead ? 'transparent' : '#f0f9ff' }}>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#fff', border: '1px solid #eee' }}>
                                        {getIcon(noti.type)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {noti.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(noti.createdAt).toLocaleString('th-TH')}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                            {noti.message}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                            {index < notifications.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                    {notifications.length === 0 && (
                        <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                            <NotificationsActive sx={{ fontSize: 60, mb: 2, color: '#e2e8f0' }} />
                            <Typography>ไม่มีประวัติการแจ้งเตือน</Typography>
                        </Box>
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default NotificationsPage;