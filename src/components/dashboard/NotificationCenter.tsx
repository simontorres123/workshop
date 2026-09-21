import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Icon } from '@iconify/react';
import AutoNotificationScheduler from './AutoNotificationScheduler';

interface NotificationCenterProps { open: boolean; onClose: () => void; }

/** Management for rules that create in-app notifications shown in the bell. */
export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} PaperProps={{ sx: { maxHeight: fullScreen ? '100dvh' : '82vh' } }}>
    <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><Icon icon="eva:bell-outline" width={27} /><Box><Typography variant="h6" component="div">Centro de notificaciones</Typography><Typography variant="body2" color="text.secondary">Reglas que crean avisos dentro de Workshop.</Typography></Box></Box>
        <IconButton onClick={onClose} aria-label="Cerrar"><Icon icon="eva:close-outline" /></IconButton>
      </Box>
    </DialogTitle>
    <DialogContent sx={{ p: { xs: 2, sm: 3 } }}><AutoNotificationScheduler /></DialogContent>
  </Dialog>;
}
