import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  IconButton
} from '@mui/material';
import { Icon } from '@iconify/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ScheduledNotification {
  id: string;
  type: string;
  title: string;
  schedule: string;
  enabled: boolean;
  nextRun: string;
}

interface NotificationType {
  title: string;
  description: string;
  defaultSchedule: string;
}

export default function AutoNotificationScheduler() {
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [availableTypes, setAvailableTypes] = useState<Record<string, NotificationType>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Hook para enviar notificaciones push
  const { isSubscribed, sendTestNotification } = usePushNotifications();
  
  const [newNotification, setNewNotification] = useState({
    type: '',
    schedule: '',
    customTime: { hour: 9, minute: 0 },
    frequency: 'daily', // daily, weekly, custom
    weekday: 1, // 1=lunes, 7=domingo (para weekly)
    testRun: false
  });

  const scheduleOptions = [
    { value: 'daily_8am', label: 'Diario a las 8:00 AM' },
    { value: 'daily_9am', label: 'Diario a las 9:00 AM' },
    { value: 'daily_6pm', label: 'Diario a las 6:00 PM' },
    { value: 'weekly_monday_10am', label: 'Lunes a las 10:00 AM' },
    { value: 'weekly_friday_5pm', label: 'Viernes a las 5:00 PM' },
    { value: 'custom', label: 'Horario Personalizado' }
  ];

  const weekdayOptions = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' }
  ];

  // Cargar notificaciones programadas
  useEffect(() => {
    loadScheduledNotifications();
  }, []);

  const loadScheduledNotifications = async () => {
    try {
      const response = await fetch('/api/push-notifications/schedule');
      const result = await response.json();
      
      if (result.success) {
        // Validar que result.data sea un array
        const notifications = Array.isArray(result.data) ? result.data : [];
        console.log('📋 Notificaciones cargadas:', notifications);
        setScheduledNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      setScheduledNotifications([]);
    }
  };

  const handleCreateNotification = async () => {
    if (!newNotification.type) {
      setError('Selecciona tipo de notificación');
      return;
    }

    let scheduleString = newNotification.schedule;
    
    // Si es horario personalizado, generar el string de horario
    if (newNotification.schedule === 'custom') {
      const { hour, minute } = newNotification.customTime;
      const { frequency, weekday } = newNotification;
      
      if (frequency === 'daily') {
        scheduleString = `custom_daily_${hour}h${minute}m`;
      } else if (frequency === 'weekly') {
        const weekdayName = weekdayOptions.find(w => w.value === weekday)?.label.toLowerCase();
        scheduleString = `custom_weekly_${weekdayName}_${hour}h${minute}m`;
      }
    }

    if (!scheduleString) {
      setError('Configura el horario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/push-notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newNotification.type,
          schedule: scheduleString,
          config: {
            testRun: newNotification.testRun,
            customTime: newNotification.schedule === 'custom' ? newNotification.customTime : undefined,
            frequency: newNotification.schedule === 'custom' ? newNotification.frequency : undefined,
            weekday: newNotification.schedule === 'custom' ? newNotification.weekday : undefined
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setAvailableTypes(result.availableTypes || {});
        await loadScheduledNotifications();
        setDialogOpen(false);
        setNewNotification({ 
          type: '', 
          schedule: '', 
          customTime: { hour: 9, minute: 0 },
          frequency: 'daily',
          weekday: 1,
          testRun: false 
        });
        
        if (newNotification.testRun) {
          setError('Notificación automática se enviará en 5 segundos');
          
          // Verificar si el usuario está suscrito
          if (!isSubscribed) {
            setError('Para recibir notificaciones automáticas, primero suscríbete en la pestaña "Push Notifications"');
            setTimeout(() => setError(null), 10000);
            return;
          }
          
          // Esperar y enviar la notificación usando el endpoint automático
          setTimeout(async () => {
            try {
              console.log('🤖 Enviando notificación automática desde el frontend...');
              
              // Hacer fetch al endpoint de notificación automática
              const autoResponse = await fetch('/api/push-notifications/send-auto', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: newNotification.type,
                  title: getNotificationTitle(newNotification.type),
                  body: getNotificationBody(newNotification.type),
                  data: { url: getNotificationUrl(newNotification.type) }
                })
              });
              
              if (autoResponse.ok) {
                const autoResult = await autoResponse.json();
                console.log('📱 Respuesta del servidor automático:', autoResult);
                
                // Si el servidor indica que debemos mostrar la notificación localmente
                if (autoResult.action === 'show_notification' && autoResult.payload) {
                  console.log('📱 Mostrando notificación automática localmente...');
                  console.log('🔍 Payload para sendTestNotification:', {
                    title: autoResult.payload.title,
                    body: autoResult.payload.body,
                    data: autoResult.payload.data,
                    tag: autoResult.payload.tag,
                    icon: autoResult.payload.icon
                  });
                  
                  // Usar el hook para mostrar la notificación
                  console.log('🚀 Llamando a sendTestNotification...');
                  const success = await sendTestNotification({
                    title: autoResult.payload.title,
                    body: autoResult.payload.body,
                    data: autoResult.payload.data,
                    tag: autoResult.payload.tag,
                    icon: autoResult.payload.icon
                  });
                  
                  console.log('🎯 Resultado de sendTestNotification:', success);
                  
                  if (success) {
                    console.log('✅ Notificación automática enviada exitosamente al navegador');
                    setError('✅ Notificación automática enviada correctamente');
                  } else {
                    console.log('❌ Error enviando notificación automática al navegador');
                    setError('❌ Error mostrando la notificación automática');
                  }
                } else {
                  console.log('⚠️ El servidor no retornó action=show_notification o payload vacío');
                  console.log('🔍 autoResult completo:', autoResult);
                }
              } else {
                console.log('❌ Error en la respuesta del servidor:', autoResponse.status);
                const errorText = await autoResponse.text();
                console.log('❌ Error text:', errorText);
              }
            } catch (error) {
              console.error('❌ Error enviando notificación automática:', error);
              setError('Error enviando notificación automática');
            }
          }, 5000);
          
          setTimeout(() => setError(null), 8000);
        }
      } else {
        setError(result.error || 'Error creando notificación');
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error creating notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (id: string, isActive: boolean) => {
    setLoading(true);
    
    try {
      console.log(`Actualizando notificación ${id} a ${isActive ? 'activa' : 'inactiva'}`);
      
      const response = await fetch('/api/push-notifications/schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isActive
        })
      });

      if (response.ok) {
        // Recargar las notificaciones para mostrar el estado actualizado
        await loadScheduledNotifications();
      } else {
        console.error('Error actualizando notificación:', response.status);
        setError('Error actualizando el estado de la notificación');
      }
    } catch (error) {
      console.error('Error updating notification:', error);
      setError('Error de conexión al actualizar notificación');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/push-notifications/schedule', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        await loadScheduledNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNextRun = (dateString: string | undefined) => {
    if (!dateString || typeof dateString !== 'string') {
      return 'Fecha no válida';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha no válida';
      }
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  const getScheduleLabel = (schedule: any) => {
    // Validar que schedule existe
    if (!schedule) {
      return 'Horario no definido';
    }
    
    // Si es un objeto schedule (horario personalizado)
    if (typeof schedule === 'object' && schedule.time) {
      const { frequency, time, weekday } = schedule;
      const timeString = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
      
      if (frequency === 'daily') {
        return `Diario a las ${timeString}`;
      } else if (frequency === 'weekly' && weekday) {
        const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const weekdayName = weekdays[weekday === 7 ? 0 : weekday] || 'Lunes';
        return `${weekdayName} a las ${timeString}`;
      }
      
      return `Personalizado: ${timeString}`;
    }
    
    // Si es string (horarios predefinidos)
    if (typeof schedule === 'string') {
      const option = scheduleOptions.find(opt => opt.value === schedule);
      if (option) return option.label;
      
      // Si es horario personalizado legacy, parsearlo
      if (schedule.startsWith('custom_')) {
        const parts = schedule.split('_');
        if (parts.length >= 3 && parts[1] === 'daily') {
          const timePart = parts[2]; // "9h30m"
          const hourMatch = timePart.match(/(\d+)h/);
          const minuteMatch = timePart.match(/(\d+)m/);
          const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
          return `Diario a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        } else if (parts.length >= 4 && parts[1] === 'weekly') {
          const weekdayName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
          const timePart = parts[3]; // "9h30m"
          const hourMatch = timePart.match(/(\d+)h/);
          const minuteMatch = timePart.match(/(\d+)m/);
          const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
          return `${weekdayName} a las ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }
      
      return schedule;
    }
    
    return 'Horario no definido';
  };

  // Funciones auxiliares para generar contenido dinámico
  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'warranty_expiring': return '⚠️ Garantías por Vencer';
      case 'low_stock': return '📦 Stock Bajo Detectado';
      case 'pending_repairs': return '🔧 Reparaciones Pendientes';
      case 'daily_summary': return '📊 Resumen del Día';
      case 'backup_reminder': return '💾 Recordatorio: Backup';
      default: return '🔔 Notificación del Sistema';
    }
  };

  const getNotificationBody = (type: string) => {
    switch (type) {
      case 'warranty_expiring': return 'Tienes 3 productos con garantía que vence en los próximos 7 días';
      case 'low_stock': return '5 productos tienen stock por debajo del mínimo';
      case 'pending_repairs': return 'Hay 2 reparaciones sin finalizar desde hace más de 3 días';
      case 'daily_summary': return 'Ayer: 5 ventas, 2 reparaciones completadas, $1,250 en ingresos';
      case 'backup_reminder': return 'Es hora de hacer un respaldo de tus datos importantes';
      default: return 'Tienes actualizaciones pendientes en Workshop Pro';
    }
  };

  const getNotificationUrl = (type: string) => {
    switch (type) {
      case 'warranty_expiring': return '/admin/inventory?filter=warranty_expiring';
      case 'low_stock': return '/admin/inventory?filter=low_stock';
      case 'pending_repairs': return '/admin/repairs?status=pending';
      case 'daily_summary': return '/admin/dashboard';
      case 'backup_reminder': return '/admin/system';
      default: return '/admin/dashboard';
    }
  };

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardHeader
          avatar={<Icon icon="eva:clock-outline" width={24} />}
          title="Notificaciones Automáticas"
          subheader="Programa notificaciones que se envían solas"
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<Icon icon="eva:plus-outline" />}
              onClick={() => setDialogOpen(true)}
              disabled={loading}
            >
              Nueva
            </Button>
          }
        />
        
        <CardContent>
          {error && (
            <Alert 
              severity={error.includes('enviará') ? 'info' : 'error'} 
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Advertencia si no está suscrito */}
          {!isSubscribed && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Para recibir notificaciones automáticas, primero suscríbete en la pestaña "Push Notifications"
              </Typography>
            </Alert>
          )}

          {/* Lista de notificaciones programadas */}
          {scheduledNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Icon icon="eva:bell-off-outline" width={48} style={{ opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No hay notificaciones programadas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Crea tu primera notificación automática
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {scheduledNotifications
                .filter((notification) => notification && typeof notification === 'object' && notification.id)
                .map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      px: 0,
                      opacity: notification.isActive ? 1 : 0.6
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {notification.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={notification.isActive ? 'Activa' : 'Pausada'}
                            color={notification.isActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {getScheduleLabel(notification?.schedule)}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Próxima: {notification?.nextRun ? formatNextRun(notification.nextRun) : 'No programada'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Switch
                          size="small"
                          checked={notification.isActive}
                          onChange={(e) => handleToggleNotification(notification.id, e.target.checked)}
                          disabled={loading}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={loading}
                        >
                          <Icon icon="eva:trash-2-outline" width={16} />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < scheduledNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Información */}
          <Box sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 1 }}>
            <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Icon icon="eva:info-outline" width={14} />
              Las notificaciones se envían automáticamente según el horario configurado
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog para crear nueva notificación */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:plus-outline" />
            Nueva Notificación Automática
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Notificación</InputLabel>
              <Select
                value={newNotification.type}
                onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value }))}
                label="Tipo de Notificación"
              >
                <MenuItem value="warranty_expiring">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:alert-triangle-outline" />
                    Garantías por Vencer
                  </Box>
                </MenuItem>
                <MenuItem value="low_stock">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:cube-outline" />
                    Stock Bajo
                  </Box>
                </MenuItem>
                <MenuItem value="pending_repairs">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:settings-outline" />
                    Reparaciones Pendientes
                  </Box>
                </MenuItem>
                <MenuItem value="daily_summary">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:bar-chart-outline" />
                    Resumen Diario
                  </Box>
                </MenuItem>
                <MenuItem value="backup_reminder">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:hard-drive-outline" />
                    Recordatorio de Backup
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Horario</InputLabel>
              <Select
                value={newNotification.schedule}
                onChange={(e) => setNewNotification(prev => ({ ...prev, schedule: e.target.value }))}
                label="Horario"
              >
                {scheduleOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Controles de tiempo personalizado */}
            {newNotification.schedule === 'custom' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:clock-outline" />
                  Configuración Personalizada
                </Typography>
                
                <FormControl fullWidth size="small">
                  <InputLabel>Frecuencia</InputLabel>
                  <Select
                    value={newNotification.frequency}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, frequency: e.target.value }))}
                    label="Frecuencia"
                  >
                    {frequencyOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {newNotification.frequency === 'weekly' && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Día de la semana</InputLabel>
                    <Select
                      value={newNotification.weekday}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, weekday: Number(e.target.value) }))}
                      label="Día de la semana"
                    >
                      {weekdayOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Hora</InputLabel>
                    <Select
                      value={newNotification.customTime.hour}
                      onChange={(e) => setNewNotification(prev => ({ 
                        ...prev, 
                        customTime: { ...prev.customTime, hour: Number(e.target.value) }
                      }))}
                      label="Hora"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i.toString().padStart(2, '0')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Minutos</InputLabel>
                    <Select
                      value={newNotification.customTime.minute}
                      onChange={(e) => setNewNotification(prev => ({ 
                        ...prev, 
                        customTime: { ...prev.customTime, minute: Number(e.target.value) }
                      }))}
                      label="Minutos"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i.toString().padStart(2, '0')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Icon icon="eva:info-outline" width={14} />
                  {newNotification.frequency === 'daily' 
                    ? `Se ejecutará todos los días a las ${newNotification.customTime.hour.toString().padStart(2, '0')}:${newNotification.customTime.minute.toString().padStart(2, '0')}`
                    : `Se ejecutará cada ${weekdayOptions.find(w => w.value === newNotification.weekday)?.label} a las ${newNotification.customTime.hour.toString().padStart(2, '0')}:${newNotification.customTime.minute.toString().padStart(2, '0')}`
                  }
                </Typography>
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={newNotification.testRun}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, testRun: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Prueba inmediata
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enviar una notificación de prueba en 5 segundos
                  </Typography>
                </Box>
              }
            />

            <Alert severity="info">
              La notificación se programará y ejecutará automáticamente según el horario seleccionado.
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} size="small">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateNotification}
            disabled={loading || !newNotification.type || !newNotification.schedule}
            startIcon={loading ? <CircularProgress size={16} /> : <Icon icon="eva:plus-outline" />}
            size="small"
          >
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}