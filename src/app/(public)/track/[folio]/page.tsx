"use client";

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Divider,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Stack
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useParams, useRouter } from 'next/navigation';
import { PublicRepairStatus, REPAIR_STATUS_CONFIG } from '@/types';
import { usePublicTracking } from '@/hooks/useRepairOrders';
import { formatDate, formatDateTime } from '@/utils/date';

// Orden de estados según el flujo real de reparaciones
const STATUS_ORDER = [
  'pending_diagnosis',
  'diagnosis_confirmed', 
  'repair_accepted',
  'in_repair',
  'repaired',
  'completed',
  'delivered'
] as const;

// Mapeo de estados reales a configuración de steps
const getStepConfig = (status: string) => {
  const configs: Record<string, { label: string; description: string; icon: string }> = {
    'pending_diagnosis': {
      label: 'Diagnóstico Pendiente',
      description: 'Su aparato está siendo evaluado por nuestros técnicos',
      icon: 'eva:search-outline'
    },
    'diagnosis_confirmed': {
      label: 'Diagnóstico Confirmado', 
      description: 'Hemos identificado el problema y preparado el presupuesto',
      icon: 'eva:checkmark-circle-outline'
    },
    'repair_accepted': {
      label: 'Reparación Autorizada',
      description: 'Ha autorizado la reparación y está en cola de trabajo', 
      icon: 'eva:edit-outline'
    },
    'in_repair': {
      label: 'En Reparación',
      description: 'Nuestro técnico está trabajando en su aparato',
      icon: 'eva:settings-outline'
    },
    'repaired': {
      label: 'Reparado',
      description: 'La reparación está completa y se están realizando pruebas',
      icon: 'eva:checkmark-circle-2-outline'
    },
    'completed': {
      label: 'Completado',
      description: 'Su aparato está listo y puede recogerlo',
      icon: 'eva:cube-outline'
    },
    'delivered': {
      label: 'Entregado', 
      description: 'Su aparato ha sido entregado exitosamente',
      icon: 'eva:heart-outline'
    },
    'cancelled': {
      label: 'Cancelado',
      description: 'La orden ha sido cancelada',
      icon: 'eva:close-circle-outline'
    }
  };

  return configs[status] || {
    label: status,
    description: 'Estado personalizado',
    icon: 'eva:question-mark-circle-outline'
  };
};

export default function TrackResultsPage() {
  const params = useParams();
  const router = useRouter();
  const folio = params.folio as string;
  
  const [repairOrder, setRepairOrder] = useState<PublicRepairStatus | null>(null);
  const { trackByFolio, loading, error } = usePublicTracking();

  useEffect(() => {
    if (folio) {
      loadRepairOrder();
    }
  }, [folio]);

  const loadRepairOrder = async () => {
    try {
      const order = await trackByFolio(folio);
      setRepairOrder(order);
    } catch (err) {
      // Error ya manejado en el hook
    }
  };

  const handleBackToSearch = () => {
    router.push('/track');
  };

  const getActiveStep = (status: string) => {
    return STATUS_ORDER.indexOf(status as any);
  };

  const getStepsToShow = (currentStatus: string) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus as any);
    
    // Si es un estado no reconocido, mostrar solo ese estado
    if (currentIndex === -1) {
      return [getStepConfig(currentStatus)];
    }
    
    // Si es cancelado, mostrar solo los estados hasta el anterior + cancelado
    if (currentStatus === 'cancelled') {
      const stepsBeforeCancellation = STATUS_ORDER.slice(0, Math.max(0, currentIndex)).map(getStepConfig);
      return [...stepsBeforeCancellation, getStepConfig('cancelled')];
    }
    
    // Para estados normales, mostrar hasta el estado actual (inclusive)
    return STATUS_ORDER.slice(0, currentIndex + 1).map(getStepConfig);
  };

  const getEstimatedDate = (order: PublicRepairStatus) => {
    if (order.estimatedCompletionDate) {
      return formatDate(order.estimatedCompletionDate);
    }
    return null;
  };

  const getPaymentInfo = (order: PublicRepairStatus) => {
    const info = [];
    
    if (order.totalCost) {
      info.push(`Costo total: $${order.totalCost.toLocaleString()}`);
    }
    
    if (order.advancePayment) {
      info.push(`Anticipo: $${order.advancePayment.toLocaleString()}`);
    }
    
    if (order.totalCost && order.advancePayment) {
      const remaining = order.totalCost - order.advancePayment;
      info.push(`Pendiente: $${remaining.toLocaleString()}`);
    }
    
    return info;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Consultando estado...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Icon 
            icon="eva:alert-circle-outline" 
            width={64} 
            height={64} 
            color="error.main"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="h5" gutterBottom>
            {error.includes('no se encontró') ? 'Reparación no encontrada' : 'Error al consultar'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={handleBackToSearch}
            startIcon={<Icon icon="eva:arrow-back-outline" />}
          >
            Realizar nueva búsqueda
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!repairOrder) {
    return null;
  }

  const activeStep = getActiveStep(repairOrder.status);
  const stepsToShow = getStepsToShow(repairOrder.status);
  const statusConfig = REPAIR_STATUS_CONFIG[repairOrder.status];
  const estimatedDate = getEstimatedDate(repairOrder);
  const paymentInfo = getPaymentInfo(repairOrder);

  // Función para obtener notas relacionadas con un estado específico
  const getNotesForStatus = (status: string) => {
    return repairOrder.publicNotes?.filter(note => 
      note.statusChange?.includes(status) || 
      note.statusChange === status
    ) || [];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          onClick={handleBackToSearch}
          startIcon={<Icon icon="eva:arrow-back-outline" />}
          sx={{ mb: 2 }}
        >
          Nueva consulta
        </Button>
        
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Folio: {repairOrder.folio}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {repairOrder.device.brand} {repairOrder.device.model} - {repairOrder.device.type}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="large"
                icon={<Icon icon={statusConfig.icon} width={20} />}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Ingresado: {formatDate(repairOrder.createdAt)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Grid container spacing={4}>
        {/* Progress Stepper */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Progreso de la Reparación
              </Typography>
              
              <Stepper activeStep={activeStep} orientation="vertical">
                {stepsToShow.map((step, index) => {
                  const isCompleted = index < activeStep;
                  const isActive = index === activeStep;
                  const stepStatus = STATUS_ORDER[index] || repairOrder.status;
                  const stepNotes = getNotesForStatus(stepStatus);
                  
                  return (
                    <Step key={`${step.label}-${index}`} completed={isCompleted}>
                      <StepLabel
                        StepIconComponent={({ active, completed }) => (
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
                              color: 'white'
                            }}
                          >
                            <Icon 
                              icon={completed ? 'eva:checkmark-outline' : step.icon} 
                              width={16}
                            />
                          </Avatar>
                        )}
                      >
                        <Typography variant="subtitle1" fontWeight={isActive || isCompleted ? 600 : 400}>
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {step.description}
                        </Typography>
                        
                        {/* Mostrar notas si las hay */}
                        {stepNotes.length > 0 && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              <Icon icon="eva:message-circle-outline" width={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                              Notas de este estado:
                            </Typography>
                            {stepNotes.map((note, noteIndex) => (
                              <Box key={noteIndex} sx={{ mb: noteIndex < stepNotes.length - 1 ? 1 : 0 }}>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                  "{note.content}"
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDateTime(note.createdAt)}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Details Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Device Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Icon icon="eva:settings-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Información del Aparato
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ '& > div': { mb: 1 } }}>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {repairOrder.device.type}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Marca:</strong> {repairOrder.device.brand}
                  </Typography>
                  {repairOrder.device.model && (
                    <Typography variant="body2">
                      <strong>Modelo:</strong> {repairOrder.device.model}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Descripción:</strong> {repairOrder.device.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Problem Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Icon icon="eva:info-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Estado Actual
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Estado:</strong> {statusConfig.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusConfig.description}
                </Typography>
              </CardContent>
            </Card>

            {/* Payment Info */}
            {paymentInfo.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Icon icon="eva:credit-card-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Información de Pagos
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {paymentInfo.map((info, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      {info}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Estimated Date */}
            {estimatedDate && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Icon icon="eva:calendar-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Fecha Estimada
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">
                    {estimatedDate}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Contact Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Icon icon="eva:message-circle-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  ¿Necesitas ayuda?
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Icon icon="eva:phone-outline" />}
                    href="tel:+1234567890"
                  >
                    Llamar al Taller
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Icon icon="eva:message-square-outline" />}
                    href={`https://wa.me/1234567890?text=Hola,%20consulto%20sobre%20mi%20reparación%20${repairOrder.folio}`}
                    target="_blank"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Icon icon="eva:email-outline" />}
                    href={`mailto:contacto@taller.com?subject=Consulta sobre reparación ${repairOrder.folio}`}
                  >
                    Enviar Email
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Notes Timeline */}
      {repairOrder.publicNotes && repairOrder.publicNotes.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              <Icon icon="eva:file-text-outline" width={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Notas y Actualizaciones
            </Typography>
            <List>
              {repairOrder.publicNotes.map((note, index) => (
                <ListItem key={index} alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Icon icon="eva:message-square-outline" width={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={note.content}
                    secondary={formatDateTime(note.createdAt)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}