import React, { useEffect, useState } from 'react';
import axios from '../api/axiosClient';
import { Box, Typography, Paper, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, useTheme, alpha, IconButton } from '@mui/material';
import { CheckCircle, Warning, Info, NotificationsActive, DeleteOutline, MarkEmailRead } from '@mui/icons-material';
import PageHeader from '../components/ui/PageHeader';

const NotificationsPage = () => {
    const theme = useTheme();
    const [notifications, setNotifications] = useState<any[]>([]);

    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;

    useEffect(() => {
        if (user) {
            axios.get(`/Notification/MyNotifications?userId=${user.userId}&roleId=${user.roleId}`)
                .then(res => setNotifications(res.data.notifications))
                .catch(err => console.error(err));
        }
    }, [user]);

    const getIcon = (type: string) => {
        if (type === 'SUCCESS') return <CheckCircle color="success" />;
        if (type === 'WARNING') return <Warning color="warning" />;
        return <Info color="info" />;
    };

    const handleMarkAllRead = () => {
        // Mock function to mark all as read
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        setNotifications(updated);
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="รายการแจ้งเตือน (Notifications)"
                subtitle="ประวัติการแจ้งเตือนทั้งหมดของระบบ"
                icon={<NotificationsActive fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'แจ้งเตือน' }
                ]}
                action={
                    <IconButton onClick={handleMarkAllRead} color="primary" title="Mark all as read">
                        <MarkEmailRead />
                    </IconButton>
                }
            />

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
                            <NotificationsActive sx={{ fontSize: 64, mb: 2, color: theme.palette.action.disabled }} />
                            <Typography variant="h6" color="text.secondary">ไม่มีประวัติการแจ้งเตือน</Typography>
                        </Box>
                    ) : (
                        notifications.map((noti, index) => (
                            <React.Fragment key={noti.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        bgcolor: noti.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                                        transition: '0.2s',
                                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) },
                                        py: 2
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'white', border: `1px solid ${theme.palette.divider}` }}>
                                            {getIcon(noti.type)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="subtitle1" fontWeight={noti.isRead ? 'normal' : 'bold'}>
                                                    {noti.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(noti.createdAt).toLocaleString('th-TH')}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0 }}>
                                                {noti.message}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                                {index < notifications.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default NotificationsPage;