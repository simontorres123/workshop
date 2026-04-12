import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationStatus {
  webPush: {
    configured: boolean;
    publicKey?: string;
  };
  fcm: {
    configured: boolean;
    projectId?: string;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export default function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError
  } = usePushNotifications();

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState({
    title: 'Workshop Pro - Notificación de Prueba',
    body: 'Esta es una notificación de prueba del sistema de reparaciones',
    type: 'test' as 'test' | 'warranty' | 'storage'
  });

  // Manejar toggle de notificaciones
  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  // Manejar envío de notificación de prueba
  const handleSendTest = async () => {
    const success = await sendTestNotification({
      title: testMessage.title,
      body: testMessage.body,
      data: { 
        type: testMessage.type,
        url: '/dashboard'
      }
    });

    if (success) {
      setTestDialogOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          avatar={<Icon icon="eva:bell-outline" width={24} />}
          title="Notificaciones Push"
          subheader="Configuración de notificaciones push para el sistema de reparaciones"
        />
        
        <CardContent>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          {!isSupported && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tu navegador no soporta notificaciones push
            </Alert>
          )}

          {/* Estado y configuración */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Estado de las Notificaciones Push
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                icon={<Icon icon={isSubscribed ? "eva:checkmark-circle-2-outline" : "eva:close-circle-outline"} />}
                label={isSubscribed ? 'Suscrito' : 'No suscrito'}
                color={isSubscribed ? 'success' : 'default'}
                variant="outlined"
              />
              
              <Chip
                icon={<Icon icon={isSupported ? "eva:checkmark-circle-2-outline" : "eva:close-circle-outline"} />}
                label={isSupported ? 'Soportado' : 'No soportado'}
                color={isSupported ? 'success' : 'error'}
                variant="outlined"
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isSubscribed}
                  onChange={(e) => handleToggleNotifications(e.target.checked)}
                  disabled={loading || !isSupported}
                />
              }
              label={isSubscribed ? 'Notificaciones habilitadas' : 'Notificaciones deshabilitadas'}
            />

            {subscription && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  <strong>Endpoint:</strong> {subscription.endpoint.substring(0, 60)}...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Acciones */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <LoadingButton
              variant="outlined"
              startIcon={<Icon icon="eva:paper-plane-outline" />}
              onClick={() => setTestDialogOpen(true)}
              disabled={!isSubscribed}
              loading={loading}
            >
              Enviar Notificación de Prueba
            </LoadingButton>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Procesando...
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Dialog de notificación de prueba */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:paper-plane-outline" />
            Enviar Notificación de Prueba
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Título"
              value={testMessage.title}
              onChange={(e) => setTestMessage(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              variant="outlined"
            />
            
            <TextField
              label="Mensaje"
              value={testMessage.body}
              onChange={(e) => setTestMessage(prev => ({ ...prev, body: e.target.value }))}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
            />

            <FormControl fullWidth variant="outlined">
              <InputLabel>Tipo de Notificación</InputLabel>
              <Select
                value={testMessage.type}
                onChange={(e) => setTestMessage(prev => ({ ...prev, type: e.target.value as any }))}
                label="Tipo de Notificación"
              >
                <MenuItem value="test">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:flash-outline" />
                    Prueba
                  </Box>
                </MenuItem>
                <MenuItem value="warranty">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:shield-outline" />
                    Garantía
                  </Box>
                </MenuItem>
                <MenuItem value="storage">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:archive-outline" />
                    Almacenamiento
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 1 }}>
              La notificación aparecerá en tu navegador y te permitirá interactuar con ella.
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleSendTest}
            loading={loading}
            startIcon={<Icon icon="eva:paper-plane-outline" />}
          >
            Enviar Notificación
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}