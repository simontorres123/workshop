import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Stack,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { automatedNotificationClientService as automatedNotificationService, NotificationRule } from '@/services/automated-notification-client.service';

interface AlertConfigurationPanelProps {
  open: boolean;
  onClose: () => void;
  onRulesUpdated?: () => void;
}

interface AlertTemplate {
  id: string;
  name: string;
  type: 'storage' | 'warranty' | 'general';
  description: string;
  conditions: any;
  actions: any;
  template: {
    subject: string;
    message: string;
  };
}

const alertTemplates: AlertTemplate[] = [
  {
    id: 'custom-storage-urgent',
    name: 'Almacenamiento Urgente Personalizado',
    type: 'storage',
    description: 'Alerta cuando el costo de almacenamiento supera un umbral',
    conditions: {
      minimumCost: 200,
      daysRemaining: 5
    },
    actions: {
      whatsapp: true,
      email: true,
      inApp: true
    },
    template: {
      subject: '💰 Costo de almacenamiento elevado',
      message: 'Su {deviceType} ha generado ${cost} en costos de almacenamiento. Recójalo pronto para evitar cargos adicionales.'
    }
  },
  {
    id: 'warranty-vip',
    name: 'Garantía VIP',
    type: 'warranty',
    description: 'Notificación especial para clientes premium',
    conditions: {
      daysRemaining: 45,
      severity: 'warning'
    },
    actions: {
      email: true,
      autoCall: true,
      inApp: true
    },
    template: {
      subject: '🌟 Recordatorio VIP: Su garantía',
      message: 'Como cliente VIP, le recordamos que su garantía para {deviceType} vence en {daysRemaining} días. ¿Necesita algún servicio?'
    }
  },
  {
    id: 'high-value-device',
    name: 'Dispositivos de Alto Valor',
    type: 'storage',
    description: 'Atención especial para reparaciones costosas',
    conditions: {
      minimumCost: 100,
      daysRemaining: 10
    },
    actions: {
      whatsapp: true,
      autoCall: true,
      inApp: true
    },
    template: {
      subject: '⭐ Su reparación premium está lista',
      message: 'Su {deviceType} de alto valor está reparado y listo. Por favor recójalo dentro de {daysRemaining} días.'
    }
  }
];

export default function AlertConfigurationPanel({ 
  open, 
  onClose, 
  onRulesUpdated 
}: AlertConfigurationPanelProps) {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AlertTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingRule, setTestingRule] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open]);

  const loadRules = () => {
    const currentRules = automatedNotificationService.getRules();
    setRules(currentRules);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    automatedNotificationService.updateRule(ruleId, { enabled });
    loadRules();
    
    if (onRulesUpdated) {
      onRulesUpdated();
    }
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule({ ...rule });
  };

  const handleSaveRule = () => {
    if (!editingRule) return;

    if (rules.find(r => r.id === editingRule.id)) {
      // Actualizar regla existente
      automatedNotificationService.updateRule(editingRule.id, editingRule);
    } else {
      // Agregar nueva regla
      automatedNotificationService.addRule(editingRule);
    }

    setEditingRule(null);
    loadRules();
    
    if (onRulesUpdated) {
      onRulesUpdated();
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    automatedNotificationService.removeRule(ruleId);
    loadRules();
    
    if (onRulesUpdated) {
      onRulesUpdated();
    }
  };

  const handleCreateFromTemplate = (template: AlertTemplate) => {
    const newRule: NotificationRule = {
      id: `custom-${Date.now()}`,
      name: template.name,
      type: template.type,
      enabled: false,
      conditions: template.conditions,
      actions: template.actions,
      schedule: {
        frequency: 'daily',
        time: '09:00'
      },
      template: template.template
    };

    setEditingRule(newRule);
    setCreateDialogOpen(false);
  };

  const handleTestRule = async (ruleId: string) => {
    setTestingRule(ruleId);
    
    // Simular prueba de regla
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Regla ${ruleId} probada exitosamente`);
    setTestingRule(null);
  };

  const getRuleTypeIcon = (type: string) => {
    const icons = {
      storage: 'eva:archive-outline',
      warranty: 'eva:shield-outline',
      general: 'eva:bell-outline'
    };
    return icons[type as keyof typeof icons] || 'eva:settings-outline';
  };

  const getRuleTypeColor = (type: string) => {
    const colors = {
      storage: 'warning',
      warranty: 'info',
      general: 'primary'
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      immediate: 'Inmediata',
      daily: 'Diaria',
      weekly: 'Semanal'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const formatNextRun = (rule: NotificationRule) => {
    if (rule.schedule.frequency === 'immediate') return 'Al activarse';
    if (!rule.nextRun) return 'No programada';
    
    return new Date(rule.nextRun).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:bell-outline" width={24} />
              <Box>
                <Typography variant="h6">Configuración de Alertas</Typography>
                <Typography variant="caption" color="text.secondary">
                  {rules.length} reglas configuradas • {rules.filter(r => r.enabled).length} activas
                </Typography>
              </Box>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<Icon icon="eva:plus-outline" />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Nueva Regla
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Reglas Existentes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reglas de Notificación Configuradas
            </Typography>
            
            {rules.length === 0 ? (
              <Alert severity="info">
                <AlertTitle>No hay reglas configuradas</AlertTitle>
                Crea tu primera regla de notificación para automatizar las alertas del sistema.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {rules.map((rule) => (
                  <Grid item xs={12} md={6} key={rule.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        opacity: rule.enabled ? 1 : 0.6,
                        borderColor: rule.enabled ? `${getRuleTypeColor(rule.type)}.main` : 'divider'
                      }}
                    >
                      <CardHeader
                        avatar={
                          <Icon 
                            icon={getRuleTypeIcon(rule.type)} 
                            width={24} 
                            color={`${getRuleTypeColor(rule.type)}.main`}
                          />
                        }
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {rule.name}
                            </Typography>
                            <Chip
                              label={rule.type}
                              size="small"
                              color={getRuleTypeColor(rule.type) as any}
                              variant="outlined"
                            />
                          </Box>
                        }
                        subheader={
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                              label={getFrequencyLabel(rule.schedule.frequency)}
                              size="small"
                              variant="outlined"
                            />
                            {rule.schedule.time && (
                              <Typography variant="caption" color="text.secondary">
                                a las {rule.schedule.time}
                              </Typography>
                            )}
                          </Stack>
                        }
                        action={
                          <Switch
                            checked={rule.enabled}
                            onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                            color={getRuleTypeColor(rule.type) as any}
                          />
                        }
                      />
                      
                      <CardContent sx={{ pt: 0 }}>
                        {/* Condiciones */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Condiciones:
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {rule.conditions.daysRemaining && (
                              <Chip
                                label={`≤${rule.conditions.daysRemaining} días`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {rule.conditions.severity && (
                              <Chip
                                label={rule.conditions.severity}
                                size="small"
                                color={rule.conditions.severity === 'critical' ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            )}
                            {rule.conditions.minimumCost && (
                              <Chip
                                label={`≥$${rule.conditions.minimumCost}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>

                        {/* Acciones */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Acciones:
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {rule.actions.whatsapp && (
                              <Chip
                                icon={<Icon icon="eva:message-circle-outline" width={12} />}
                                label="WhatsApp"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            )}
                            {rule.actions.email && (
                              <Chip
                                icon={<Icon icon="eva:email-outline" width={12} />}
                                label="Email"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                            {rule.actions.sms && (
                              <Chip
                                icon={<Icon icon="eva:message-square-outline" width={12} />}
                                label="SMS"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {rule.actions.autoCall && (
                              <Chip
                                icon={<Icon icon="eva:phone-outline" width={12} />}
                                label="Llamada"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>

                        {/* Próxima ejecución */}
                        <Typography variant="caption" color="text.secondary">
                          Próxima ejecución: {formatNextRun(rule)}
                        </Typography>
                      </CardContent>

                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Icon icon="eva:edit-outline" />}
                          onClick={() => handleEditRule(rule)}
                        >
                          Editar
                        </Button>
                        
                        <LoadingButton
                          size="small"
                          startIcon={<Icon icon="eva:play-circle-outline" />}
                          loading={testingRule === rule.id}
                          onClick={() => handleTestRule(rule.id)}
                          disabled={!rule.enabled}
                        >
                          Probar
                        </LoadingButton>
                        
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Icon icon="eva:trash-2-outline" />}
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          Eliminar
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Estadísticas de Reglas */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Estadísticas de Reglas
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {rules.length}
                  </Typography>
                  <Typography variant="caption">Total</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="success.main" fontWeight="bold">
                    {rules.filter(r => r.enabled).length}
                  </Typography>
                  <Typography variant="caption">Activas</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="warning.main" fontWeight="bold">
                    {rules.filter(r => r.type === 'storage').length}
                  </Typography>
                  <Typography variant="caption">Almacenamiento</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="info.main" fontWeight="bold">
                    {rules.filter(r => r.type === 'warranty').length}
                  </Typography>
                  <Typography variant="caption">Garantía</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Crear Nueva Regla */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Crear Nueva Regla de Alerta
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Selecciona una plantilla para comenzar o crea una regla personalizada desde cero.
          </Typography>
          
          <Grid container spacing={2}>
            {alertTemplates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: `${getRuleTypeColor(template.type)}.main`,
                      bgcolor: `${getRuleTypeColor(template.type)}.lighter`
                    }
                  }}
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Icon 
                        icon={getRuleTypeIcon(template.type)} 
                        width={20} 
                        color={`${getRuleTypeColor(template.type)}.main`}
                      />
                      <Typography variant="subtitle2" fontWeight="bold">
                        {template.name}
                      </Typography>
                      <Chip
                        label={template.type}
                        size="small"
                        color={getRuleTypeColor(template.type) as any}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            {/* Opción para regla personalizada */}
            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.lighter'
                  }
                }}
                onClick={() => {
                  setEditingRule({
                    id: `custom-${Date.now()}`,
                    name: 'Regla Personalizada',
                    type: 'storage',
                    enabled: false,
                    conditions: {},
                    actions: { inApp: true },
                    schedule: { frequency: 'daily', time: '09:00' },
                    template: {
                      subject: 'Alerta personalizada',
                      message: 'Mensaje personalizado'
                    }
                  });
                  setCreateDialogOpen(false);
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Icon icon="eva:plus-circle-outline" width={48} color="primary.main" />
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Crear Regla Personalizada
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configura condiciones y acciones específicas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Editar Regla */}
      <Dialog 
        open={!!editingRule} 
        onClose={() => setEditingRule(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          {editingRule && rules.find(r => r.id === editingRule.id) ? 'Editar Regla' : 'Nueva Regla'}
        </DialogTitle>
        <DialogContent>
          {editingRule && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                {/* Información Básica */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Información Básica
                  </Typography>
                  
                  <Stack spacing={2}>
                    <TextField
                      label="Nombre de la regla"
                      value={editingRule.name}
                      onChange={(e) => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : null)}
                      fullWidth
                    />
                    
                    <FormControl fullWidth>
                      <InputLabel>Tipo de alerta</InputLabel>
                      <Select
                        value={editingRule.type}
                        onChange={(e) => setEditingRule(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                        label="Tipo de alerta"
                      >
                        <MenuItem value="storage">Almacenamiento</MenuItem>
                        <MenuItem value="warranty">Garantía</MenuItem>
                        <MenuItem value="general">General</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Grid>

                {/* Condiciones */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Condiciones
                  </Typography>
                  
                  <Stack spacing={2}>
                    <TextField
                      label="Días restantes (máximo)"
                      type="number"
                      value={editingRule.conditions.daysRemaining || ''}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        conditions: { ...prev.conditions, daysRemaining: Number(e.target.value) || undefined }
                      } : null)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días</InputAdornment>
                      }}
                      fullWidth
                    />
                    
                    <TextField
                      label="Costo mínimo"
                      type="number"
                      value={editingRule.conditions.minimumCost || ''}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        conditions: { ...prev.conditions, minimumCost: Number(e.target.value) || undefined }
                      } : null)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      fullWidth
                    />
                    
                    <FormControl fullWidth>
                      <InputLabel>Severidad</InputLabel>
                      <Select
                        value={editingRule.conditions.severity || ''}
                        onChange={(e) => setEditingRule(prev => prev ? {
                          ...prev,
                          conditions: { ...prev.conditions, severity: e.target.value || undefined }
                        } : null)}
                        label="Severidad"
                      >
                        <MenuItem value="">
                          <em>Cualquiera</em>
                        </MenuItem>
                        <MenuItem value="warning">Advertencia</MenuItem>
                        <MenuItem value="critical">Crítica</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Grid>

                {/* Acciones */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Acciones
                  </Typography>
                  
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingRule.actions.whatsapp || false}
                          onChange={(e) => setEditingRule(prev => prev ? {
                            ...prev,
                            actions: { ...prev.actions, whatsapp: e.target.checked }
                          } : null)}
                        />
                      }
                      label="Enviar WhatsApp"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingRule.actions.email || false}
                          onChange={(e) => setEditingRule(prev => prev ? {
                            ...prev,
                            actions: { ...prev.actions, email: e.target.checked }
                          } : null)}
                        />
                      }
                      label="Enviar Email"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingRule.actions.sms || false}
                          onChange={(e) => setEditingRule(prev => prev ? {
                            ...prev,
                            actions: { ...prev.actions, sms: e.target.checked }
                          } : null)}
                        />
                      }
                      label="Enviar SMS"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingRule.actions.autoCall || false}
                          onChange={(e) => setEditingRule(prev => prev ? {
                            ...prev,
                            actions: { ...prev.actions, autoCall: e.target.checked }
                          } : null)}
                        />
                      }
                      label="Llamada automática"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingRule.actions.inApp || false}
                          onChange={(e) => setEditingRule(prev => prev ? {
                            ...prev,
                            actions: { ...prev.actions, inApp: e.target.checked }
                          } : null)}
                        />
                      }
                      label="Notificación in-app"
                    />
                  </Stack>
                </Grid>

                {/* Programación */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Programación
                  </Typography>
                  
                  <Stack direction="row" spacing={2}>
                    <FormControl sx={{ minWidth: 200 }}>
                      <InputLabel>Frecuencia</InputLabel>
                      <Select
                        value={editingRule.schedule.frequency}
                        onChange={(e) => setEditingRule(prev => prev ? {
                          ...prev,
                          schedule: { ...prev.schedule, frequency: e.target.value as any }
                        } : null)}
                        label="Frecuencia"
                      >
                        <MenuItem value="immediate">Inmediata</MenuItem>
                        <MenuItem value="daily">Diaria</MenuItem>
                        <MenuItem value="weekly">Semanal</MenuItem>
                      </Select>
                    </FormControl>
                    
                    {editingRule.schedule.frequency !== 'immediate' && (
                      <TextField
                        label="Hora"
                        type="time"
                        value={editingRule.schedule.time || '09:00'}
                        onChange={(e) => setEditingRule(prev => prev ? {
                          ...prev,
                          schedule: { ...prev.schedule, time: e.target.value }
                        } : null)}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  </Stack>
                </Grid>

                {/* Plantilla de Mensaje */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Plantilla de Mensaje
                  </Typography>
                  
                  <Stack spacing={2}>
                    <TextField
                      label="Asunto"
                      value={editingRule.template.subject}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        template: { ...prev.template, subject: e.target.value }
                      } : null)}
                      fullWidth
                    />
                    
                    <TextField
                      label="Mensaje"
                      multiline
                      rows={4}
                      value={editingRule.template.message}
                      onChange={(e) => setEditingRule(prev => prev ? {
                        ...prev,
                        template: { ...prev.template, message: e.target.value }
                      } : null)}
                      helperText="Usa {deviceType}, {folio}, {clientName}, {daysRemaining}, {cost} para personalizar"
                      fullWidth
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRule(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRule}
            startIcon={<Icon icon="eva:save-outline" />}
          >
            Guardar Regla
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}