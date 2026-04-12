import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  IconButton,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  CardActions,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Paper,
  Grid
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { useStorageGroupedOrders } from '@/hooks/useRepairedOrders';
import { markOrderAsContacted, getOrderContactHistory } from '@/lib/database/dashboard-queries';
import { RepairOrder } from '@/types/repair';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuickActionsPanelProps {
  open: boolean;
  onClose: () => void;
  onActionCompleted?: (action: string, orderId?: string) => void;
}

interface ContactAction {
  orderId: string;
  orderFolio: string;
  clientName: string;
  clientPhone: string;
  deviceType: string;
  urgencyLevel: 'critical' | 'high' | 'medium';
  estimatedCost?: number;
  daysRemaining: number;
}

interface BulkAction {
  type: 'contact_all' | 'send_reminders' | 'generate_report' | 'update_status';
  name: string;
  description: string;
  icon: string;
  color: 'primary' | 'warning' | 'error' | 'success';
  enabled: boolean;
}

export default function QuickActionsPanel({ open, onClose, onActionCompleted }: QuickActionsPanelProps) {
  const { groupedOrders, storageData, loading } = useStorageGroupedOrders();
  const [urgentActions, setUrgentActions] = useState<ContactAction[]>([]);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ContactAction | null>(null);
  const [contactMethod, setContactMethod] = useState<'phone' | 'whatsapp' | 'email'>('whatsapp');
  const [contactNotes, setContactNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

  const bulkActions: BulkAction[] = [
    {
      type: 'contact_all',
      name: 'Contactar Críticos',
      description: 'Enviar WhatsApp a todas las órdenes críticas',
      icon: 'eva:message-circle-outline',
      color: 'error',
      enabled: groupedOrders.critical.length > 0
    },
    {
      type: 'send_reminders',
      name: 'Enviar Recordatorios',
      description: 'Recordatorios automáticos a órdenes con advertencia',
      icon: 'eva:bell-outline',
      color: 'warning',
      enabled: groupedOrders.warning.length > 0
    },
    {
      type: 'generate_report',
      name: 'Reporte de Urgencias',
      description: 'Generar reporte PDF de todas las alertas',
      icon: 'eva:file-text-outline',
      color: 'primary',
      enabled: true
    },
    {
      type: 'update_status',
      name: 'Marcar como Contactados',
      description: 'Marcar órdenes seleccionadas como contactadas',
      icon: 'eva:checkmark-circle-outline',
      color: 'success',
      enabled: selectedActions.size > 0
    }
  ];

  useEffect(() => {
    if (storageData && !loading) {
      generateUrgentActions();
    }
  }, [storageData, loading]);

  const generateUrgentActions = () => {
    if (!storageData) return;

    const actions: ContactAction[] = [];

    // Procesar alertas críticas
    storageData.storageAlerts
      .filter(alert => alert.severity === 'critical')
      .forEach(alert => {
        const order = groupedOrders.critical.find(o => o.id === alert.id);
        if (order) {
          actions.push({
            orderId: order.id,
            orderFolio: order.folio,
            clientName: order.clientName,
            clientPhone: order.clientPhone,
            deviceType: order.deviceType,
            urgencyLevel: 'critical',
            estimatedCost: alert.estimatedCost,
            daysRemaining: alert.daysRemaining
          });
        }
      });

    // Procesar alertas de advertencia con costo alto
    storageData.storageAlerts
      .filter(alert => alert.severity === 'warning' && (alert.estimatedCost || 0) > 300)
      .forEach(alert => {
        const order = groupedOrders.warning.find(o => o.id === alert.id);
        if (order) {
          actions.push({
            orderId: order.id,
            orderFolio: order.folio,
            clientName: order.clientName,
            clientPhone: order.clientPhone,
            deviceType: order.deviceType,
            urgencyLevel: 'high',
            estimatedCost: alert.estimatedCost,
            daysRemaining: alert.daysRemaining
          });
        }
      });

    // Ordenar por urgencia y costo
    actions.sort((a, b) => {
      if (a.urgencyLevel !== b.urgencyLevel) {
        const urgencyOrder = { critical: 3, high: 2, medium: 1 };
        return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      }
      return (b.estimatedCost || 0) - (a.estimatedCost || 0);
    });

    setUrgentActions(actions);
  };

  const handleActionSelect = (actionId: string, selected: boolean) => {
    setSelectedActions(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(actionId);
      } else {
        newSet.delete(actionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedActions.size === urgentActions.length) {
      setSelectedActions(new Set());
    } else {
      setSelectedActions(new Set(urgentActions.map(a => a.orderId)));
    }
  };

  const handleContactOrder = (action: ContactAction) => {
    setSelectedOrder(action);
    setContactDialogOpen(true);
  };

  const handleConfirmContact = async () => {
    if (!selectedOrder) return;

    try {
      setProcessing(true);

      // Marcar como contactado en la base de datos
      await markOrderAsContacted(
        selectedOrder.orderId,
        contactMethod,
        contactNotes || `Contactado por urgencia: ${selectedOrder.urgencyLevel}`
      );

      // Simular envío de mensaje según el método
      switch (contactMethod) {
        case 'whatsapp':
          await sendWhatsAppMessage(selectedOrder);
          break;
        case 'phone':
          await makePhoneCall(selectedOrder);
          break;
        case 'email':
          await sendEmailNotification(selectedOrder);
          break;
      }

      // Notificar completado
      if (onActionCompleted) {
        onActionCompleted('contact_individual', selectedOrder.orderId);
      }

      // Limpiar formulario
      setContactDialogOpen(false);
      setContactNotes('');
      setSelectedOrder(null);

      // Actualizar lista
      generateUrgentActions();

    } catch (error) {
      console.error('Error contactando cliente:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async (actionType: string) => {
    try {
      setProcessing(true);

      switch (actionType) {
        case 'contact_all':
          await contactAllCritical();
          break;
        case 'send_reminders':
          await sendReminders();
          break;
        case 'generate_report':
          await generateUrgencyReport();
          break;
        case 'update_status':
          await markSelectedAsContacted();
          break;
      }

      if (onActionCompleted) {
        onActionCompleted(actionType);
      }

      setBulkActionsOpen(false);
      generateUrgentActions();

    } catch (error) {
      console.error('Error ejecutando acción masiva:', error);
    } finally {
      setProcessing(false);
    }
  };

  const sendWhatsAppMessage = async (action: ContactAction) => {
    // Simular envío de WhatsApp
    const message = `🚨 URGENTE: Su ${action.deviceType} (${action.orderFolio}) debe ser recogido. ${
      action.daysRemaining < 0 
        ? `Ha excedido el período de almacenamiento por ${Math.abs(action.daysRemaining)} días.`
        : `Le quedan ${action.daysRemaining} días de almacenamiento gratuito.`
    }${action.estimatedCost ? ` Costo actual: $${action.estimatedCost.toLocaleString()}` : ''} 📞 Contáctenos: 555-REPAIR`;

    console.log(`📱 WhatsApp enviado a ${action.clientPhone}: ${message}`);
    
    // En producción, aquí integrarías con la API de WhatsApp
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const makePhoneCall = async (action: ContactAction) => {
    // Simular llamada telefónica
    console.log(`📞 Llamada programada a ${action.clientPhone} para ${action.clientName}`);
    
    // En producción, integrarías con un sistema de llamadas
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const sendEmailNotification = async (action: ContactAction) => {
    // Simular envío de email
    console.log(`📧 Email enviado para orden ${action.orderFolio}`);
    
    // En producción, enviarías el email real
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const contactAllCritical = async () => {
    const criticalActions = urgentActions.filter(a => a.urgencyLevel === 'critical');
    
    for (const action of criticalActions) {
      await sendWhatsAppMessage(action);
      await markOrderAsContacted(action.orderId, 'whatsapp', 'Contactado automáticamente por estado crítico');
    }

    console.log(`✅ ${criticalActions.length} clientes críticos contactados`);
  };

  const sendReminders = async () => {
    const warningActions = urgentActions.filter(a => a.urgencyLevel === 'high');
    
    for (const action of warningActions) {
      await sendWhatsAppMessage(action);
      await markOrderAsContacted(action.orderId, 'whatsapp', 'Recordatorio automático enviado');
    }

    console.log(`✅ ${warningActions.length} recordatorios enviados`);
  };

  const generateUrgencyReport = async () => {
    // Simular generación de reporte
    const reportData = {
      totalUrgent: urgentActions.length,
      critical: urgentActions.filter(a => a.urgencyLevel === 'critical').length,
      high: urgentActions.filter(a => a.urgencyLevel === 'high').length,
      totalCost: urgentActions.reduce((sum, a) => sum + (a.estimatedCost || 0), 0),
      generatedAt: new Date().toISOString()
    };

    console.log('📊 Reporte de urgencias generado:', reportData);
    
    // En producción, generarías un PDF real
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const markSelectedAsContacted = async () => {
    const selectedOrders = urgentActions.filter(a => selectedActions.has(a.orderId));
    
    for (const order of selectedOrders) {
      await markOrderAsContacted(order.orderId, 'manual', 'Marcado como contactado manualmente');
    }

    setSelectedActions(new Set());
    console.log(`✅ ${selectedOrders.length} órdenes marcadas como contactadas`);
  };

  const getUrgencyColor = (level: ContactAction['urgencyLevel']) => {
    switch (level) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getUrgencyIcon = (level: ContactAction['urgencyLevel']) => {
    switch (level) {
      case 'critical': return 'eva:alert-circle-fill';
      case 'high': return 'eva:alert-triangle-outline';
      case 'medium': return 'eva:info-outline';
      default: return 'eva:radio-button-on-outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 400 } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 450 } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:flash-outline" width={24} color="warning.main" />
              <Typography variant="h6" fontWeight="bold">
                Acciones Rápidas
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Icon icon="eva:close-outline" />
            </IconButton>
          </Box>

          {/* Resumen */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'warning.lighter' }}>
            <Typography variant="subtitle2" gutterBottom>
              Resumen de Urgencias
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h4" color="error" fontWeight="bold">
                  {urgentActions.filter(a => a.urgencyLevel === 'critical').length}
                </Typography>
                <Typography variant="caption">Críticas</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {urgentActions.filter(a => a.urgencyLevel === 'high').length}
                </Typography>
                <Typography variant="caption">Alta prioridad</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Acciones Masivas */}
          <Button
            variant="contained"
            startIcon={<Icon icon="eva:flash-outline" />}
            onClick={() => setBulkActionsOpen(true)}
            sx={{ mb: 2 }}
            disabled={urgentActions.length === 0}
          >
            Acciones Masivas
          </Button>

          {/* Lista de Acciones Individuales */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2">
                Contactos Individuales ({urgentActions.length})
              </Typography>
              {urgentActions.length > 0 && (
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  startIcon={
                    <Checkbox
                      checked={selectedActions.size === urgentActions.length}
                      indeterminate={selectedActions.size > 0 && selectedActions.size < urgentActions.length}
                      size="small"
                    />
                  }
                >
                  {selectedActions.size === urgentActions.length ? 'Deseleccionar' : 'Seleccionar'} Todo
                </Button>
              )}
            </Box>

            {urgentActions.length === 0 ? (
              <Alert severity="success">
                <AlertTitle>¡Excelente!</AlertTitle>
                No hay acciones urgentes pendientes en este momento.
              </Alert>
            ) : (
              <List sx={{ overflow: 'auto', flex: 1 }}>
                {urgentActions.map((action) => (
                  <ListItem
                    key={action.orderId}
                    sx={{
                      border: 1,
                      borderColor: `${getUrgencyColor(action.urgencyLevel)}.light`,
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: `${getUrgencyColor(action.urgencyLevel)}.lighter`
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedActions.has(action.orderId)}
                        onChange={(e) => handleActionSelect(action.orderId, e.target.checked)}
                        size="small"
                      />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Icon 
                            icon={getUrgencyIcon(action.urgencyLevel)} 
                            width={16} 
                            color={`${getUrgencyColor(action.urgencyLevel)}.main`}
                          />
                          <Typography variant="subtitle2" fontWeight="bold">
                            {action.orderFolio}
                          </Typography>
                          <Chip
                            label={action.urgencyLevel.toUpperCase()}
                            size="small"
                            color={getUrgencyColor(action.urgencyLevel)}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {action.clientName} - {action.deviceType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {action.daysRemaining < 0 
                              ? `Vencido hace ${Math.abs(action.daysRemaining)} días`
                              : `${action.daysRemaining} días restantes`
                            }
                            {action.estimatedCost && (
                              <> • {formatCurrency(action.estimatedCost)}</>
                            )}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          color={getUrgencyColor(action.urgencyLevel)}
                          onClick={() => handleContactOrder(action)}
                        >
                          <Icon icon="eva:phone-outline" width={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setSelectedOrder(action);
                            setContactMethod('whatsapp');
                            handleConfirmContact();
                          }}
                        >
                          <Icon icon="eva:message-circle-outline" width={16} />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Footer con acciones seleccionadas */}
          {selectedActions.size > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'primary.lighter' }}>
              <Typography variant="subtitle2" gutterBottom>
                {selectedActions.size} órdenes seleccionadas
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Icon icon="eva:message-circle-outline" />}
                  onClick={() => handleBulkAction('contact_all')}
                >
                  WhatsApp Masivo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Icon icon="eva:checkmark-outline" />}
                  onClick={() => handleBulkAction('update_status')}
                >
                  Marcar Contactadas
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      </Drawer>

      {/* Dialog de Contacto Individual */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Contactar Cliente - {selectedOrder?.orderFolio}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 1 }}>
              <Alert severity={getUrgencyColor(selectedOrder.urgencyLevel)} sx={{ mb: 2 }}>
                <AlertTitle>Urgencia: {selectedOrder.urgencyLevel.toUpperCase()}</AlertTitle>
                {selectedOrder.clientName} - {selectedOrder.deviceType}
                <br />
                {selectedOrder.daysRemaining < 0 
                  ? `Vencido hace ${Math.abs(selectedOrder.daysRemaining)} días`
                  : `${selectedOrder.daysRemaining} días restantes`
                }
                {selectedOrder.estimatedCost && (
                  <> • Costo: {formatCurrency(selectedOrder.estimatedCost)}</>
                )}
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Método de contacto</InputLabel>
                <Select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value as any)}
                  label="Método de contacto"
                >
                  <MenuItem value="whatsapp">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:message-circle-outline" width={16} />
                      WhatsApp
                    </Box>
                  </MenuItem>
                  <MenuItem value="phone">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:phone-outline" width={16} />
                      Llamada
                    </Box>
                  </MenuItem>
                  <MenuItem value="email">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon icon="eva:email-outline" width={16} />
                      Email
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Notas del contacto"
                multiline
                rows={3}
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Detalles de la conversación, respuesta del cliente, etc."
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleConfirmContact}
            loading={processing}
            startIcon={<Icon icon="eva:checkmark-outline" />}
          >
            Confirmar Contacto
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Dialog de Acciones Masivas */}
      <Dialog open={bulkActionsOpen} onClose={() => setBulkActionsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:flash-outline" width={24} />
            Acciones Masivas
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {bulkActions.map((action) => (
              <Grid item xs={12} sm={6} key={action.type}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: action.enabled ? 'pointer' : 'not-allowed',
                    opacity: action.enabled ? 1 : 0.5,
                    '&:hover': action.enabled ? {
                      borderColor: `${action.color}.main`,
                      bgcolor: `${action.color}.lighter`
                    } : {}
                  }}
                  onClick={() => action.enabled && handleBulkAction(action.type)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Icon 
                        icon={action.icon} 
                        width={24} 
                        color={action.enabled ? `${action.color}.main` : 'text.disabled'}
                      />
                      <Typography variant="subtitle2" fontWeight="bold">
                        {action.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionsOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}