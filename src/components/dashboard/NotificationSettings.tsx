import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Button,
  Box,
  Divider,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

interface NotificationSettingsProps {
  onPreferencesChange?: (preferences: NotificationPreferences) => void;
}

export default function NotificationSettings({ 
  onPreferencesChange 
}: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    whatsapp: false,
    inApp: true
  });

  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [lastResult, setLastResult] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handlePreferenceChange = (key: keyof NotificationPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newPreferences = {
      ...preferences,
      [key]: event.target.checked
    };
    setPreferences(newPreferences);
    onPreferencesChange?.(newPreferences);
  };

  const handlePreviewAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/warranty-alerts?dryRun=true');
      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.data);
        setPreviewOpen(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error previewing alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/warranty-alerts', {
        method: 'GET',
      });
      const result = await response.json();
      
      if (result.success) {
        setLastResult(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warranty':
        return 'eva:shield-outline';
      case 'storage':
        return 'eva:archive-outline';
      default:
        return 'eva:bell-outline';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          avatar={<Icon icon="eva:bell-outline" width={24} />}
          title="Configuración de Notificaciones"
          subheader="Gestiona las alertas automáticas de garantías y almacenamiento"
        />
        
        <CardContent>
          {/* Preferencias de Notificación */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Canales de Notificación
          </Typography>
          
          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.email}
                  onChange={handlePreferenceChange('email')}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:email-outline" width={20} />
                  <Typography>Email</Typography>
                  <Chip label="Recomendado" size="small" color="primary" variant="outlined" />
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.sms}
                  onChange={handlePreferenceChange('sms')}
                  color="secondary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:message-square-outline" width={20} />
                  <Typography>SMS</Typography>
                  <Chip label="Premium" size="small" color="secondary" variant="outlined" />
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.whatsapp}
                  onChange={handlePreferenceChange('whatsapp')}
                  color="success"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:message-circle-outline" width={20} />
                  <Typography>WhatsApp</Typography>
                  <Chip label="Beta" size="small" color="success" variant="outlined" />
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.inApp}
                  onChange={handlePreferenceChange('inApp')}
                  color="info"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:bell-outline" width={20} />
                  <Typography>Notificaciones en la App</Typography>
                </Box>
              }
            />
          </FormGroup>

          <Divider sx={{ my: 3 }} />

          {/* Acciones */}
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Gestión de Alertas
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Icon icon="eva:eye-outline" />}
              onClick={handlePreviewAlerts}
              disabled={loading}
            >
              Vista Previa
            </Button>
            
            <LoadingButton
              variant="contained"
              startIcon={<Icon icon="eva:paper-plane-outline" />}
              onClick={handleSendNotifications}
              loading={loading}
              disabled={!Object.values(preferences).some(p => p)}
            >
              Enviar Ahora
            </LoadingButton>
          </Box>

          {/* Resultados del Último Envío */}
          {lastResult && (
            <Alert 
              severity={lastResult.failed === 0 ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              <Typography fontWeight="bold">
                Último envío completado
              </Typography>
              <Typography variant="body2">
                ✅ {lastResult.sent} enviadas • ❌ {lastResult.failed} fallidas
              </Typography>
              {lastResult.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="error">
                    Errores: {lastResult.errors.join(', ')}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          {/* Información */}
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Frecuencia:</strong> Las notificaciones se envían automáticamente 30 días antes del vencimiento (advertencia) y 7 días antes (crítica).
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Dialog de Vista Previa */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="eva:eye-outline" width={24} />
          Vista Previa de Alertas
        </DialogTitle>
        
        <DialogContent>
          {previewData ? (
            <Box>
              {/* Resumen */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<Icon icon="eva:bell-outline" />}
                  label={`${previewData.totalAlerts} Total`}
                  color="primary"
                />
                <Chip 
                  icon={<Icon icon="eva:alert-triangle-outline" />}
                  label={`${previewData.criticalAlerts} Críticas`}
                  color="error"
                />
                <Chip 
                  icon={<Icon icon="eva:shield-outline" />}
                  label={`${previewData.warrantyAlerts} Garantías`}
                  color="warning"
                />
                <Chip 
                  icon={<Icon icon="eva:archive-outline" />}
                  label={`${previewData.storageAlerts} Almacenamiento`}
                  color="info"
                />
              </Box>

              {/* Lista de Alertas */}
              {previewData.alerts && previewData.alerts.length > 0 ? (
                <List>
                  {previewData.alerts.slice(0, 10).map((alert: any, index: number) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Icon 
                          icon={getAlertIcon(alert.type)} 
                          width={24}
                          color={getAlertColor(alert.severity)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${alert.folio} - ${alert.clientName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {alert.deviceType} • {alert.daysRemaining} días restantes
                            </Typography>
                            <Chip
                              label={alert.type === 'warranty' ? 'Garantía' : 'Almacenamiento'}
                              size="small"
                              color={getAlertColor(alert.severity)}
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {previewData.alerts.length > 10 && (
                    <ListItem>
                      <ListItemText
                        primary={`... y ${previewData.alerts.length - 10} alertas más`}
                        sx={{ textAlign: 'center', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="success">
                  <Typography>
                    ¡Excelente! No hay alertas de vencimiento pendientes.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}