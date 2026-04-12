import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Alert,
  AlertTitle,
  InputAdornment,
  Chip,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { getSystemConfiguration, updateSystemConfiguration } from '@/lib/database/dashboard-queries';
import PushNotificationSettings from '@/components/ui/PushNotificationSettings';
import ExternalServicesManager from './ExternalServicesManager';

interface ConfigurationPanelProps {
  open: boolean;
  onClose: () => void;
  onConfigUpdated?: (config: any) => void;
}

interface SystemConfig {
  storage: {
    costPerDay: number;
    freeDays: number;
    warningDays: number;
    criticalDays: number;
  };
  warranty: {
    defaultPeriodMonths: number;
    warningDays: number;
    criticalDays: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    inApp: boolean;
  };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    workingHours: string;
  };
}

export default function ConfigurationPanel({ open, onClose, onConfigUpdated }: ConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadConfiguration();
    }
  }, [open]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      const systemConfig = await getSystemConfiguration();
      setConfig(systemConfig);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (section: string, field: string, value: any) => {
    if (!config) return;

    const newConfig = {
      ...config,
      [section]: {
        ...config[section as keyof SystemConfig],
        [field]: value
      }
    };

    setConfig(newConfig);
    setChanges(prev => new Set([...prev, `${section}.${field}`]));
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      await updateSystemConfiguration(config);
      
      if (onConfigUpdated) {
        onConfigUpdated(config);
      }

      setChanges(new Set());
      
      // Mostrar mensaje de éxito y cerrar después de un momento
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfiguration();
    setChanges(new Set());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Icon icon="eva:loader-outline" width={48} className="animate-spin" />
            <Typography sx={{ mt: 2 }}>Cargando configuración...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '80vh' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="eva:settings-outline" width={24} />
          <Box>
            <Typography variant="h6">Configuración del Sistema</Typography>
            <Typography variant="caption" color="text.secondary">
              Personalizar costos, alertas y notificaciones
              {changes.size > 0 && (
                <Chip
                  label={`${changes.size} cambios`}
                  color="warning"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab 
              label="Almacenamiento" 
              icon={<Icon icon="eva:archive-outline" width={20} />} 
              iconPosition="start"
            />
            <Tab 
              label="Garantías" 
              icon={<Icon icon="eva:shield-outline" width={20} />} 
              iconPosition="start"
            />
            <Tab 
              label="Notificaciones" 
              icon={<Icon icon="eva:bell-outline" width={20} />} 
              iconPosition="start"
            />
            <Tab 
              label="Negocio" 
              icon={<Icon icon="eva:briefcase-outline" width={20} />} 
              iconPosition="start"
            />
            <Tab 
              label="Servicios de Notificación" 
              icon={<Icon icon="eva:message-circle-outline" width={20} />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab 1: Configuración de Almacenamiento */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:calculator-outline" width={20} />}
                  title="Costos de Almacenamiento"
                  subheader="Configurar tarifas y períodos"
                />
                <CardContent>
                  <Stack spacing={3}>
                    <TextField
                      label="Costo por día"
                      type="number"
                      value={config.storage.costPerDay}
                      onChange={(e) => handleConfigChange('storage', 'costPerDay', Number(e.target.value))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        endAdornment: <InputAdornment position="end">MXN</InputAdornment>
                      }}
                      helperText="Costo diario por aparato en almacenamiento"
                      fullWidth
                    />
                    
                    <TextField
                      label="Días gratuitos"
                      type="number"
                      value={config.storage.freeDays}
                      onChange={(e) => handleConfigChange('storage', 'freeDays', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días</InputAdornment>
                      }}
                      helperText="Período gratuito antes de aplicar cargos"
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:alert-triangle-outline" width={20} />}
                  title="Alertas de Vencimiento"
                  subheader="Cuándo mostrar alertas"
                />
                <CardContent>
                  <Stack spacing={3}>
                    <TextField
                      label="Días para alerta"
                      type="number"
                      value={config.storage.warningDays}
                      onChange={(e) => handleConfigChange('storage', 'warningDays', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días antes</InputAdornment>
                      }}
                      helperText="Mostrar alerta de advertencia"
                      fullWidth
                    />
                    
                    <TextField
                      label="Días para alerta crítica"
                      type="number"
                      value={config.storage.criticalDays}
                      onChange={(e) => handleConfigChange('storage', 'criticalDays', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días antes</InputAdornment>
                      }}
                      helperText="Mostrar alerta crítica"
                      color="error"
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vista Previa de Costos
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Gratuito: ${config.storage.freeDays} días`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`Después: ${formatCurrency(config.storage.costPerDay)}/día`}
                    color="warning"
                  />
                  <Chip
                    label={`30 días: ${formatCurrency((30 - config.storage.freeDays) * config.storage.costPerDay)}`}
                    color="error"
                    variant="outlined"
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Configuración de Garantías */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:shield-outline" width={20} />}
                  title="Períodos de Garantía"
                  subheader="Configuración por defecto"
                />
                <CardContent>
                  <Stack spacing={3}>
                    <TextField
                      label="Período por defecto"
                      type="number"
                      value={config.warranty.defaultPeriodMonths}
                      onChange={(e) => handleConfigChange('warranty', 'defaultPeriodMonths', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">meses</InputAdornment>
                      }}
                      helperText="Garantía estándar para reparaciones"
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:clock-outline" width={20} />}
                  title="Alertas de Garantía"
                  subheader="Notificaciones antes del vencimiento"
                />
                <CardContent>
                  <Stack spacing={3}>
                    <TextField
                      label="Días para alerta"
                      type="number"
                      value={config.warranty.warningDays}
                      onChange={(e) => handleConfigChange('warranty', 'warningDays', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días antes</InputAdornment>
                      }}
                      helperText="Alerta de advertencia"
                      fullWidth
                    />
                    
                    <TextField
                      label="Días para alerta crítica"
                      type="number"
                      value={config.warranty.criticalDays}
                      onChange={(e) => handleConfigChange('warranty', 'criticalDays', Number(e.target.value))}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días antes</InputAdornment>
                      }}
                      helperText="Alerta crítica"
                      color="error"
                      fullWidth
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <AlertTitle>Recomendaciones</AlertTitle>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:checkmark-circle-outline" width={16} />
                    </ListItemIcon>
                    <ListItemText primary="Período estándar: 3-6 meses para electrodomésticos" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:checkmark-circle-outline" width={16} />
                    </ListItemIcon>
                    <ListItemText primary="Alerta temprana: 30 días permite tiempo suficiente para contactar clientes" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:checkmark-circle-outline" width={16} />
                    </ListItemIcon>
                    <ListItemText primary="Alerta crítica: 7 días da última oportunidad antes del vencimiento" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Configuración de Notificaciones */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:bell-outline" width={20} />}
                  title="Canales de Notificación"
                  subheader="Habilitar o deshabilitar tipos de notificaciones"
                />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Icon 
                          icon="eva:email-outline" 
                          width={32} 
                          color={config.notifications.email ? 'primary.main' : 'text.disabled'}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 1, mb: 2 }}>
                          Email
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.email}
                              onChange={(e) => handleConfigChange('notifications', 'email', e.target.checked)}
                            />
                          }
                          label={config.notifications.email ? 'Activo' : 'Inactivo'}
                        />
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Icon 
                          icon="eva:message-square-outline" 
                          width={32} 
                          color={config.notifications.sms ? 'primary.main' : 'text.disabled'}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 1, mb: 2 }}>
                          SMS
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.sms}
                              onChange={(e) => handleConfigChange('notifications', 'sms', e.target.checked)}
                            />
                          }
                          label={config.notifications.sms ? 'Activo' : 'Inactivo'}
                        />
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Icon 
                          icon="eva:message-circle-outline" 
                          width={32} 
                          color={config.notifications.whatsapp ? 'success.main' : 'text.disabled'}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 1, mb: 2 }}>
                          WhatsApp
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.whatsapp}
                              onChange={(e) => handleConfigChange('notifications', 'whatsapp', e.target.checked)}
                            />
                          }
                          label={config.notifications.whatsapp ? 'Activo' : 'Inactivo'}
                        />
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Icon 
                          icon="eva:bell-outline" 
                          width={32} 
                          color={config.notifications.inApp ? 'info.main' : 'text.disabled'}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 1, mb: 2 }}>
                          In-App
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.inApp}
                              onChange={(e) => handleConfigChange('notifications', 'inApp', e.target.checked)}
                            />
                          }
                          label={config.notifications.inApp ? 'Activo' : 'Inactivo'}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="warning">
                <AlertTitle>Configuración Requerida</AlertTitle>
                Para que las notificaciones funcionen correctamente, asegúrate de configurar:
                <List dense sx={{ mt: 1 }}>
                  <ListItem>
                    <ListItemText primary="• Variables de entorno para SMTP (email)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• API key para servicio de SMS" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Token de WhatsApp Business API" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 4: Información del Negocio */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:briefcase-outline" width={20} />}
                  title="Información del Negocio"
                  subheader="Datos que aparecerán en notificaciones y reportes"
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Nombre del negocio"
                        value={config.business.name}
                        onChange={(e) => handleConfigChange('business', 'name', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Teléfono"
                        value={config.business.phone}
                        onChange={(e) => handleConfigChange('business', 'phone', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">📞</InputAdornment>
                        }}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Email"
                        type="email"
                        value={config.business.email}
                        onChange={(e) => handleConfigChange('business', 'email', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">📧</InputAdornment>
                        }}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Horarios de atención"
                        value={config.business.workingHours}
                        onChange={(e) => handleConfigChange('business', 'workingHours', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">🕒</InputAdornment>
                        }}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        label="Dirección"
                        value={config.business.address}
                        onChange={(e) => handleConfigChange('business', 'address', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">📍</InputAdornment>
                        }}
                        multiline
                        rows={2}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 5: Servicios de Notificación */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:message-circle-outline" width={24} />
                Servicios de Notificación
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure y pruebe los servicios de notificaciones push y externos (Email, SMS, WhatsApp).
              </Typography>
            </Grid>
            
            {/* Notificaciones Push */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:smartphone-outline" width={20} />}
                  title="Notificaciones Push"
                  subheader="Configurar notificaciones web push para el navegador"
                />
                <CardContent>
                  <PushNotificationSettings />
                </CardContent>
              </Card>
            </Grid>
            
            {/* Servicios Externos */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader
                  avatar={<Icon icon="eva:cloud-outline" width={20} />}
                  title="Servicios Externos"
                  subheader="Configurar y probar Email, SMS y WhatsApp"
                />
                <CardContent>
                  <ExternalServicesManager />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Box>
            {changes.size > 0 && (
              <Typography variant="caption" color="warning.main">
                {changes.size} cambios sin guardar
              </Typography>
            )}
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            
            {changes.size > 0 && (
              <Button onClick={handleReset} disabled={saving}>
                Descartar Cambios
              </Button>
            )}
            
            <LoadingButton
              variant="contained"
              onClick={handleSave}
              loading={saving}
              disabled={changes.size === 0}
              startIcon={<Icon icon="eva:save-outline" />}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </LoadingButton>
          </Stack>
        </Box>
      </DialogActions>
    </Dialog>
  );
}