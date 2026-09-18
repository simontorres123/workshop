"use client";

import React, { useState } from 'react';
import { 
  IconButton, 
  Badge, 
  Popover, 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Button, 
  Divider,
  CircularProgress
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useInAppNotifications, InAppNotification } from '@/hooks/useInAppNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useInAppNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      router.push(notification.link);
      handleClose();
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <IconButton 
        onClick={handleClick}
        aria-describedby={id}
        sx={{ mx: 1, color: 'text.primary' }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Icon icon="eva:bell-outline" width={24} />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 360,
            maxHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 16px 0 rgba(0,0,0,0.1)',
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Notificaciones
          </Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={() => markAllAsRead()}
              sx={{ textTransform: 'none', fontSize: '0.8rem' }}
            >
              Marcar todo como leído
            </Button>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Icon icon="eva:bell-off-outline" width={40} opacity={0.5} style={{ marginBottom: 8 }} />
              <Typography variant="body2">No tienes notificaciones</Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  cursor: notification.link || !notification.is_read ? 'pointer' : 'default',
                  bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  px: 2.5,
                  py: 1.5
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: notification.is_read ? 'grey.300' : 'primary.light', color: notification.is_read ? 'grey.600' : 'primary.dark' }}>
                    <Icon icon={notification.type === 'alert' ? 'eva:alert-triangle-fill' : 'eva:bell-fill'} width={20} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography component="span" variant="subtitle2" sx={{ display: 'block', fontWeight: notification.is_read ? 400 : 600 }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {notification.body}
                      </Typography>
                      <Typography component="span" variant="caption" sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icon icon="eva:clock-outline" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                      </Typography>
                    </Box>
                  }
                />
                {!notification.is_read && (
                  <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%', mt: 2 }} />
                )}
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </>
  );
}
