import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
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
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
// LoadingButton is now part of Button component
import { Icon } from '@iconify/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationWidget() {
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
    body: 'Esta es una notificación de prueba desde el dashboard',
    stackNotifications: true,
    playSound: true,
    soundType: 'default' as 'default' | 'warning' | 'success' | 'error'
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
    // Mapear tipos de sonido a archivos
    const soundMap = {
      default: '/notification-sound.mp3',
      warning: '/notification-warning.mp3',
      success: '/notification-success.mp3',
      error: '/notification-error.mp3'
    };

    const success = await sendTestNotification({
      title: testMessage.title,
      body: testMessage.body,
      tag: testMessage.stackNotifications ? undefined : 'single-test-notification', // Si no se apilan, usar tag fijo
      playSound: testMessage.playSound,
      sound: soundMap[testMessage.soundType],
      silent: !testMessage.playSound, // Si no reproduce sonido, marcar como silencioso
      data: { 
        type: 'test',
        url: '/dashboard'
      }
    });

    if (success) {
      setTestDialogOpen(false);
    }
  };

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardHeader
          avatar={<Icon icon="eva:bell-outline" width={24} />}
          title="Notificaciones Push"
          subheader="Estado de notificaciones en tiempo real"
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
        />
        
        <CardContent>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={clearError}
              action={
                <Button size="small" onClick={clearError}>
                  <Icon icon="eva:close-outline" />
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!isSupported && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
              action={
                error?.includes('pantalla de inicio') ? (
                  <Button 
                    size="small" 
                    onClick={() => {
                      // Mostrar instrucciones detalladas
                      alert('Para habilitar notificaciones en iPhone:\n\n1. Abre esta página en Safari\n2. Toca el botón "Compartir" (⬆️)\n3. Selecciona "Agregar a pantalla de inicio"\n4. Abre la app desde la pantalla de inicio\n5. Las notificaciones estarán disponibles');
                    }}
                  >
                    ¿Cómo?
                  </Button>
                ) : undefined
              }
            >
              {error || 'Tu navegador no soporta notificaciones push'}
            </Alert>
          )}

          {/* Estado de las notificaciones */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                icon={<Icon icon={isSubscribed ? "eva:checkmark-circle-2-outline" : "eva:close-circle-outline"} />}
                label={isSubscribed ? 'Activadas' : 'Desactivadas'}
                color={isSubscribed ? 'success' : 'default'}
                variant="outlined"
                size="small"
              />
              
              <Chip
                icon={<Icon icon={isSupported ? "eva:checkmark-circle-2-outline" : "eva:close-circle-outline"} />}
                label={isSupported ? 'Soportado' : 'No soportado'}
                color={isSupported ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={isSubscribed}
                  onChange={(e) => handleToggleNotifications(e.target.checked)}
                  disabled={loading || !isSupported}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {isSubscribed ? 'Notificaciones habilitadas' : 'Habilitar notificaciones'}
                </Typography>
              }
            />

            {subscription && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', fontSize: '0.7rem' }}>
                  <strong>Dispositivo:</strong> {subscription.endpoint.substring(0, 40)}...
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Acciones rápidas */}
          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <Icon icon="eva:paper-plane-outline" />}
              onClick={() => setTestDialogOpen(true)}
              disabled={!isSubscribed || loading}
              fullWidth
            >
              {loading ? 'Enviando...' : 'Enviar Prueba'}
            </Button>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Procesando...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Información adicional */}
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Icon icon="eva:info-outline" width={14} />
              Las notificaciones te alertarán sobre garantías y almacenamiento
            </Typography>
            {(/iPad|iPhone|iPod/.test(navigator.userAgent)) && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                📱 iPhone: Requiere iOS 16.4+ y agregar app a pantalla de inicio
              </Typography>
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
              size="small"
            />
            
            <TextField
              label="Mensaje"
              value={testMessage.body}
              onChange={(e) => setTestMessage(prev => ({ ...prev, body: e.target.value }))}
              multiline
              rows={2}
              fullWidth
              variant="outlined"
              size="small"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={testMessage.stackNotifications}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, stackNotifications: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Apilar notificaciones
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {testMessage.stackNotifications 
                      ? 'Las notificaciones se apilarán (múltiples visibles)'
                      : 'Las notificaciones se reemplazarán (solo una visible)'
                    }
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={testMessage.playSound}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, playSound: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Reproducir sonido
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {testMessage.playSound 
                      ? 'La notificación reproducirá un sonido'
                      : 'La notificación será silenciosa'
                    }
                  </Typography>
                </Box>
              }
            />

            {testMessage.playSound && (
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de sonido</InputLabel>
                <Select
                  value={testMessage.soundType}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, soundType: e.target.value as any }))}
                  label="Tipo de sonido"
                >
                  <MenuItem value="default">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:bell-outline" />
                      Por defecto
                    </Box>
                  </MenuItem>
                  <MenuItem value="warning">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:alert-triangle-outline" />
                      Advertencia
                    </Box>
                  </MenuItem>
                  <MenuItem value="success">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:checkmark-circle-outline" />
                      Éxito
                    </Box>
                  </MenuItem>
                  <MenuItem value="error">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:close-circle-outline" />
                      Error
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            <Alert severity="info" sx={{ mt: 1 }}>
              La notificación aparecerá en tu navegador inmediatamente.
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)} size="small">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSendTest}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Icon icon="eva:paper-plane-outline" />}
            size="small"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}