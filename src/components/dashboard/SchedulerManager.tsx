import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Divider,
  Alert,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  LinearProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SchedulerConfig {
  enabled: boolean;
  dailyNotificationTime: string;
  weeklyReportDay: number;
  weeklyReportTime: string;
  timezone: string;
}

interface SchedulerStats {
  lastRun: string | null;
  nextRun: string | null;
  totalNotificationsSent: number;
  lastRunResult: {
    sent: number;
    failed: number;
    errors: string[];
  } | null;
  isRunning: boolean;
}

export default function SchedulerManager() {
  const [config, setConfig] = useState<SchedulerConfig>({
    enabled: false,
    dailyNotificationTime: '09:00',
    weeklyReportDay: 1,
    weeklyReportTime: '08:00',
    timezone: 'America/Mexico_City'
  });

  const [stats, setStats] = useState<SchedulerStats>({
    lastRun: null,
    nextRun: null,
    totalNotificationsSent: 0,
    lastRunResult: null,
    isRunning: false
  });

  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<SchedulerConfig>(config);
  const [error, setError] = useState<string | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/notifications');
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data.config);
        setStats(result.data.stats);
        setIsActive(result.data.isActive);
        setTempConfig(result.data.config);
      }
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
      setError('Error cargando estado del scheduler');
    }
  };

  const handleSchedulerToggle = async (enabled: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const action = enabled ? 'start' : 'stop';
      const response = await fetch('/api/scheduler/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsActive(enabled);
        await fetchSchedulerStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRun = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scheduler/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_manual' })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchSchedulerStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error ejecutando manualmente');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scheduler/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_config',
          config: tempConfig
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
        setConfigOpen(false);
        await fetchSchedulerStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error actualizando configuración');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNumber] || 'Desconocido';
  };

  const getStatusColor = () => {
    if (stats.isRunning) return 'info';
    if (isActive) return 'success';
    return 'default';
  };

  const getStatusText = () => {
    if (stats.isRunning) return 'Ejecutándose';
    if (isActive) return 'Activo';
    return 'Inactivo';
  };

  return (
    <>
      <Card>
        <CardHeader
          avatar={<Icon icon="eva:clock-outline" width={24} />}
          title="Programador de Notificaciones"
          subheader="Gestiona las notificaciones automáticas de garantías"
          action={
            <Chip 
              label={getStatusText()}
              color={getStatusColor()}
              variant={isActive ? 'filled' : 'outlined'}
              icon={
                <Icon 
                  icon={stats.isRunning ? 'eva:loader-outline' : isActive ? 'eva:checkmark-circle-outline' : 'eva:pause-circle-outline'} 
                  className={stats.isRunning ? 'rotating' : ''}
                />
              }
            />
          }
        />
        
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Control Principal */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => handleSchedulerToggle(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Notificaciones Automáticas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isActive 
                      ? 'Las notificaciones se envían automáticamente según la programación'
                      : 'Las notificaciones automáticas están deshabilitadas'
                    }
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Configuración Actual */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Configuración Actual
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:bell-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Notificaciones diarias"
                      secondary={`Todos los días a las ${config.dailyNotificationTime}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:calendar-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reportes semanales"
                      secondary={`${getDayName(config.weeklyReportDay)} a las ${config.weeklyReportTime}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:globe-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Zona horaria"
                      secondary={config.timezone}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Estadísticas
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:activity-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Última ejecución"
                      secondary={
                        stats.lastRun 
                          ? format(new Date(stats.lastRun), "dd MMM yyyy 'a las' HH:mm", { locale: es })
                          : 'Nunca'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:clock-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Próxima ejecución"
                      secondary={
                        stats.nextRun 
                          ? format(new Date(stats.nextRun), "dd MMM yyyy 'a las' HH:mm", { locale: es })
                          : 'No programada'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Icon icon="eva:email-outline" width={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total enviadas"
                      secondary={`${stats.totalNotificationsSent} notificaciones`}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>

          {/* Resultado de Última Ejecución */}
          {stats.lastRunResult && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Último Resultado
              </Typography>
              <Alert 
                severity={stats.lastRunResult.failed === 0 ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  ✅ {stats.lastRunResult.sent} enviadas • ❌ {stats.lastRunResult.failed} fallidas
                </Typography>
                {stats.lastRunResult.errors.length > 0 && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    Errores: {stats.lastRunResult.errors.join(', ')}
                  </Typography>
                )}
              </Alert>
            </Box>
          )}

          {/* Indicador de Progreso */}
          {(loading || stats.isRunning) && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {stats.isRunning ? 'Ejecutando notificaciones...' : 'Procesando...'}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Acciones */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Icon icon="eva:settings-outline" />}
              onClick={() => setConfigOpen(true)}
              disabled={loading}
            >
              Configurar
            </Button>
            
            <LoadingButton
              variant="contained"
              startIcon={<Icon icon="eva:play-circle-outline" />}
              onClick={handleManualRun}
              loading={loading}
              disabled={stats.isRunning}
            >
              Ejecutar Ahora
            </LoadingButton>

            <Button
              variant="outlined"
              startIcon={<Icon icon="eva:refresh-outline" />}
              onClick={fetchSchedulerStatus}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog de Configuración */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurar Programador</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Hora de notificaciones diarias"
              type="time"
              value={tempConfig.dailyNotificationTime}
              onChange={(e) => setTempConfig(prev => ({ 
                ...prev, 
                dailyNotificationTime: e.target.value 
              }))}
              sx={{ mb: 2 }}
              helperText="Hora en formato 24h (ej: 09:00)"
            />

            <TextField
              fullWidth
              select
              label="Día de reporte semanal"
              value={tempConfig.weeklyReportDay}
              onChange={(e) => setTempConfig(prev => ({ 
                ...prev, 
                weeklyReportDay: parseInt(e.target.value) 
              }))}
              sx={{ mb: 2 }}
              SelectProps={{ native: true }}
            >
              <option value={0}>Domingo</option>
              <option value={1}>Lunes</option>
              <option value={2}>Martes</option>
              <option value={3}>Miércoles</option>
              <option value={4}>Jueves</option>
              <option value={5}>Viernes</option>
              <option value={6}>Sábado</option>
            </TextField>

            <TextField
              fullWidth
              label="Hora de reporte semanal"
              type="time"
              value={tempConfig.weeklyReportTime}
              onChange={(e) => setTempConfig(prev => ({ 
                ...prev, 
                weeklyReportTime: e.target.value 
              }))}
              sx={{ mb: 2 }}
              helperText="Hora para generar reportes semanales"
            />

            <TextField
              fullWidth
              label="Zona horaria"
              value={tempConfig.timezone}
              onChange={(e) => setTempConfig(prev => ({ 
                ...prev, 
                timezone: e.target.value 
              }))}
              helperText="Ej: America/Mexico_City, Europe/Madrid"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleConfigSave}
            loading={loading}
          >
            Guardar
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* CSS para animación */}
      <style jsx global>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </>
  );
}