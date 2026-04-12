import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';

interface ServiceStatus {
  available: boolean;
  error?: string;
}

interface ServicesStatus {
  email: ServiceStatus;
  sms: ServiceStatus;
  whatsapp: ServiceStatus;
}

interface ServiceConfig {
  configured: boolean;
  [key: string]: any;
}

interface ServicesConfig {
  email: ServiceConfig;
  sms: ServiceConfig;
  whatsapp: ServiceConfig;
}

export default function ExternalServicesManager() {
  const [status, setStatus] = useState<ServicesStatus>({
    email: { available: false },
    sms: { available: false },
    whatsapp: { available: false }
  });

  const [config, setConfig] = useState<ServicesConfig>({
    email: { configured: false },
    sms: { configured: false },
    whatsapp: { configured: false }
  });

  const [loading, setLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [testRecipient, setTestRecipient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  // Cargar estado inicial
  useEffect(() => {
    fetchServicesStatus();
  }, []);

  const fetchServicesStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services/external-notifications');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data.services);
        setConfig(result.data.configuration);
      }
    } catch (error) {
      console.error('Error fetching services status:', error);
      setError('Error cargando estado de servicios');
    } finally {
      setLoading(false);
    }
  };

  const handleTestService = async () => {
    if (!testRecipient.trim()) {
      setError('Por favor ingresa un destinatario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/services/external-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          service: selectedService,
          recipient: testRecipient
        })
      });

      const result = await response.json();
      setLastTestResult(result);
      
      if (result.success) {
        setTestDialogOpen(false);
        setTestRecipient('');
      } else {
        setError(result.data?.error || 'Error enviando mensaje de prueba');
      }
    } catch (error) {
      setError('Error enviando mensaje de prueba');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'email':
        return 'eva:email-outline';
      case 'sms':
        return 'eva:message-square-outline';
      case 'whatsapp':
        return 'eva:message-circle-outline';
      default:
        return 'eva:settings-outline';
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'email':
        return 'Email (SMTP)';
      case 'sms':
        return 'SMS (Twilio)';
      case 'whatsapp':
        return 'WhatsApp Business';
      default:
        return service;
    }
  };

  const getStatusColor = (serviceStatus: ServiceStatus, serviceConfig: ServiceConfig) => {
    if (!serviceConfig.configured) return 'default';
    if (serviceStatus.available) return 'success';
    return 'error';
  };

  const getStatusText = (serviceStatus: ServiceStatus, serviceConfig: ServiceConfig) => {
    if (!serviceConfig.configured) return 'No configurado';
    if (serviceStatus.available) return 'Disponible';
    return 'Error';
  };

  const getPlaceholderForService = (service: 'email' | 'sms' | 'whatsapp') => {
    switch (service) {
      case 'email':
        return 'usuario@ejemplo.com';
      case 'sms':
        return '+525551234567';
      case 'whatsapp':
        return '+525551234567';
    }
  };

  const ServiceCard = ({ 
    serviceName, 
    serviceKey 
  }: { 
    serviceName: string; 
    serviceKey: keyof ServicesStatus 
  }) => {
    const serviceStatus = status[serviceKey];
    const serviceConfig = config[serviceKey];

    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon={getServiceIcon(serviceKey)} width={24} />
            <Typography variant="subtitle1" fontWeight="bold">
              {serviceName}
            </Typography>
          </Box>
          <Chip
            label={getStatusText(serviceStatus, serviceConfig)}
            color={getStatusColor(serviceStatus, serviceConfig)}
            variant="filled"
            size="small"
          />
        </Box>

        {/* Configuración */}
        <List dense>
          {serviceKey === 'email' && serviceConfig.configured && (
            <>
              <ListItem>
                <ListItemIcon>
                  <Icon icon="eva:globe-outline" width={16} />
                </ListItemIcon>
                <ListItemText
                  primary="Servidor SMTP"
                  secondary={`${serviceConfig.host}:${serviceConfig.port}`}
                />
              </ListItem>
            </>
          )}

          {serviceKey === 'sms' && serviceConfig.configured && (
            <ListItem>
              <ListItemIcon>
                <Icon icon="eva:phone-outline" width={16} />
              </ListItemIcon>
              <ListItemText
                primary="Número de envío"
                secondary={serviceConfig.fromNumber}
              />
            </ListItem>
          )}

          {serviceKey === 'whatsapp' && serviceConfig.configured && (
            <ListItem>
              <ListItemIcon>
                <Icon icon="eva:hash-outline" width={16} />
              </ListItemIcon>
              <ListItemText
                primary="Business Account"
                secondary={serviceConfig.businessAccountId || 'Configurado'}
              />
            </ListItem>
          )}
        </List>

        {/* Error */}
        {serviceStatus.error && (
          <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem' }}>
            {serviceStatus.error}
          </Alert>
        )}

        {/* Botón de prueba */}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon icon="eva:paper-plane-outline" />}
            onClick={() => {
              setSelectedService(serviceKey as 'email' | 'sms' | 'whatsapp');
              setTestDialogOpen(true);
            }}
            disabled={!serviceConfig.configured || loading}
            fullWidth
          >
            Enviar Prueba
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <>
      <Card>
        <CardHeader
          avatar={<Icon icon="eva:settings-2-outline" width={24} />}
          title="Servicios de Notificación Externa"
          subheader="Estado y configuración de servicios SMTP, SMS y WhatsApp"
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:refresh-outline" />}
              onClick={fetchServicesStatus}
              disabled={loading}
            >
              Actualizar
            </Button>
          }
        />
        
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Resultado de Última Prueba */}
          {lastTestResult && (
            <Alert 
              severity={lastTestResult.success ? 'success' : 'error'}
              sx={{ mb: 3 }}
              onClose={() => setLastTestResult(null)}
            >
              <Typography variant="body2">
                {lastTestResult.message}
              </Typography>
              {lastTestResult.data?.messageId && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  ID: {lastTestResult.data.messageId}
                </Typography>
              )}
            </Alert>
          )}

          {/* Grid de Servicios */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <ServiceCard serviceName="Email (SMTP)" serviceKey="email" />
            </Grid>
            <Grid item xs={12} md={4}>
              <ServiceCard serviceName="SMS (Twilio)" serviceKey="sms" />
            </Grid>
            <Grid item xs={12} md={4}>
              <ServiceCard serviceName="WhatsApp Business" serviceKey="whatsapp" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Instrucciones de Configuración */}
          <Accordion>
            <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:book-outline" width={20} />
                <Typography variant="subtitle2" fontWeight="bold">
                  Guía de Configuración
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Para configurar los servicios de notificación, agrega las siguientes variables de entorno:
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  📧 Email (SMTP):
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicación
SMTP_FROM_NAME=Workshop Pro`}
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  📱 SMS (Twilio):
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`TWILIO_ACCOUNT_SID=tu-account-sid
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_FROM_NUMBER=+1234567890`}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  💬 WhatsApp Business:
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.8rem', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`WHATSAPP_ACCESS_TOKEN=tu-access-token
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=tu-business-account-id`}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Dialog de Prueba */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon={getServiceIcon(selectedService)} width={24} />
          Enviar Mensaje de Prueba - {getServiceName(selectedService)}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Servicio</InputLabel>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as 'email' | 'sms' | 'whatsapp')}
                label="Servicio"
              >
                <MenuItem value="email">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:email-outline" width={20} />
                    Email (SMTP)
                  </Box>
                </MenuItem>
                <MenuItem value="sms">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:message-square-outline" width={20} />
                    SMS (Twilio)
                  </Box>
                </MenuItem>
                <MenuItem value="whatsapp">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:message-circle-outline" width={20} />
                    WhatsApp Business
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Destinatario"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder={getPlaceholderForService(selectedService)}
              helperText={`Ingresa ${selectedService === 'email' ? 'un email válido' : 'un número de teléfono con código de país'}`}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleTestService}
            loading={loading}
            startIcon={<Icon icon="eva:paper-plane-outline" />}
          >
            Enviar Prueba
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}