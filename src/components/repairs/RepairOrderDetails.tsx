"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  ImageList,
  ImageListItem,
  Skeleton,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar
} from '@mui/material';
import { Icon } from '@iconify/react';
import { RepairOrder, REPAIR_STATUS_CONFIG, StatusNote } from '@/types/repair';
import { format, addMonths, isBefore, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import WarrantyClaimHistory from './WarrantyClaimHistory';
import { useWarrantyClaims } from '@/hooks/useWarrantyClaims';
import RepairPartsSection from './RepairPartsSection';

// Función para traducir estados a español
const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending_diagnosis':
      return 'Pendiente Diagnóstico';
    case 'diagnosis_confirmed':
      return 'Diagnóstico Confirmado';
    case 'repair_accepted':
      return 'Reparación Aceptada';
    case 'in_repair':
      return 'En Reparación';
    case 'repaired':
      return 'Reparado';
    case 'delivered':
      return 'Entregado';
    case 'completed':
      return 'Completado';
    case 'repair_rejected':
      return 'Reparación Rechazada';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

interface RepairOrderDetailsProps {
  order: RepairOrder | null;
  open: boolean;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: RepairOrder) => void;
  onPrintReceipt?: (order: RepairOrder) => void;
}

export default function RepairOrderDetails({ 
  order,
  open,
  onClose,
  onOrderUpdate,
  onPrintReceipt,
}: RepairOrderDetailsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  // Hook para manejar warranty claims
  const { createWarrantyClaim, updateWarrantyClaim, loading } = useWarrantyClaims(order?.id || '');
  
  if (!order) return null;

  const statusConfig = REPAIR_STATUS_CONFIG[order.status as keyof typeof REPAIR_STATUS_CONFIG] || {
    label: order.status,
    color: 'default' as const,
    icon: 'eva:file-outline'
  };
  const warrantyBaseDate = order.deliveredAt || order.completedAt;
  const storageBaseDate = order.completedAt || order.deliveredAt;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth={isMobile ? false : "md"}
      fullWidth={!isMobile}
      scroll="paper"
      PaperProps={{
        sx: { 
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '92vh',
          overflow: 'hidden',
        }
      }}
    >
      <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Icon icon="eva:file-text-outline" width={24} />
            <Box>
              <Typography variant="h6">
                Orden {order.folio}
              </Typography>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                icon={<Icon icon={statusConfig.icon} width={16} />}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Icon icon="eva:close-outline" width={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Información del Cliente */}
          <Card variant="outlined">
            <CardHeader
              avatar={<Icon icon="eva:person-outline" width={20} />}
              title="Información del Cliente"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Nombre</Typography>
                  <Typography variant="body2" fontWeight="medium">{order.clientName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                  <Typography variant="body2" fontWeight="medium">{order.clientPhone}</Typography>
                </Box>
                {order.clientEmail && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2" fontWeight="medium">{order.clientEmail}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Información del Dispositivo */}
          <Card variant="outlined">
            <CardHeader
              avatar={<Icon icon="eva:settings-outline" width={20} />}
              title="Información del Dispositivo"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Tipo</Typography>
                  <Typography variant="body2" fontWeight="medium">{order.deviceType}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Marca</Typography>
                  <Typography variant="body2" fontWeight="medium">{order.deviceBrand}</Typography>
                </Box>
                {order.deviceModel && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Modelo</Typography>
                    <Typography variant="body2" fontWeight="medium">{order.deviceModel}</Typography>
                  </Box>
                )}
                {order.deviceSerial && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Serie</Typography>
                    <Typography variant="body2" fontWeight="medium">{order.deviceSerial}</Typography>
                  </Box>
                )}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Descripción</Typography>
                <Typography variant="body2">{order.deviceDescription}</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Problema y Diagnóstico */}
          <Card variant="outlined">
            <CardHeader
              avatar={<Icon icon="eva:alert-circle-outline" width={20} />}
              title="Problema y Diagnóstico"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Problema Reportado</Typography>
                  <Typography variant="body2">{order.problemDescription}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Diagnóstico Inicial</Typography>
                  <Typography variant="body2">{order.initialDiagnosis}</Typography>
                </Box>
                {order.confirmedDiagnosis && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Diagnóstico Confirmado</Typography>
                    <Typography variant="body2">{order.confirmedDiagnosis}</Typography>
                  </Box>
                )}
                {order.totalCost && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Costo Total</Typography>
                    <Typography variant="h6" color="primary.main">
                      ${order.totalCost.toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Imágenes del Dispositivo */}
          {order.images && order.images.length > 0 && (
            <Card variant="outlined">
              <CardHeader
                avatar={<Icon icon="eva:image-outline" width={20} />}
                title={`Imágenes del Dispositivo (${order.images.length})`}
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              />
              <CardContent sx={{ pt: 0 }}>
                <ImageList 
                  cols={isMobile ? 2 : 3}
                  gap={isMobile ? 8 : 12}
                  sx={{ 
                    width: '100%',
                    maxHeight: isMobile ? 360 : 460,
                    overflow: 'auto',
                    gridAutoRows: isMobile ? 110 : 145,
                  }}
                >
                  {order.images.map((imageUrl, index) => (
                    <ImageListItem key={index} sx={{ overflow: 'hidden', borderRadius: 1.5, bgcolor: 'grey.100' }}>
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={`Imagen del dispositivo ${index + 1}`}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          transition: 'transform 0.2s, filter 0.2s',
                          '&:hover': {
                            transform: 'scale(1.04)',
                            filter: 'brightness(0.88)',
                          }
                        }}
                        onClick={() => setSelectedImageIndex(index)}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Selecciona una imagen para verla en tamaño completo
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Fechas */}
          <RepairPartsSection repairId={order.id} status={order.status} />

          {/* Fechas */}
          <Card variant="outlined">
            <CardHeader
              avatar={<Icon icon="eva:calendar-outline" width={20} />}
              title="Fechas Importantes"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fecha de Ingreso</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {format(new Date(order.createdAt), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                  </Typography>
                </Box>
                
                {order.estimatedDate && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha Estimada</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {format(new Date(order.estimatedDate), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </Typography>
                  </Box>
                )}
                
                {order.completedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha de Finalización</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {format(new Date(order.completedAt), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </Typography>
                  </Box>
                )}

                {order.deliveredAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha de Entrega</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {format(new Date(order.deliveredAt), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                    </Typography>
                  </Box>
                )}

                {/* Fecha de Vencimiento de Garantía */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Icon icon="eva:shield-outline" width={12} />
                      Vencimiento de Garantía
                    </Box>
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      color: (() => {
                        if (!order.warrantyPeriodMonths) {
                          return 'text.disabled';
                        }
                        const baseDate = warrantyBaseDate;
                        if (!baseDate) return 'text.disabled';
                        const warrantyExpiration = addMonths(new Date(baseDate), order.warrantyPeriodMonths);
                        const daysRemaining = differenceInDays(warrantyExpiration, new Date());
                        if (daysRemaining < 0) return 'error.main';
                        if (daysRemaining <= 3) return 'error.main';
                        if (daysRemaining <= 7) return 'warning.main';
                        return 'text.primary';
                      })()
                    }}
                  >
                    {(() => {
                      if (!order.warrantyPeriodMonths) {
                        return 'Sin período de garantía';
                      }
                      
                      // Usar fecha de entrega si existe, sino fecha de completado, sino fecha de creación
                      const baseDate = warrantyBaseDate;
                      if (!baseDate) return 'Se calculará al entregar el aparato';
                      const warrantyExpiration = addMonths(new Date(baseDate), order.warrantyPeriodMonths);
                      const daysRemaining = differenceInDays(warrantyExpiration, new Date());
                      const dateText = format(warrantyExpiration, 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
                      
                      if (daysRemaining < 0) {
                        return `${dateText} (Vencida hace ${Math.abs(daysRemaining)} días)`;
                      } else if (daysRemaining === 0) {
                        return `${dateText} (Vence hoy)`;
                      } else if (daysRemaining <= 7) {
                        return `${dateText} (${daysRemaining} días restantes)`;
                      } else {
                        return dateText;
                      }
                    })()}
                  </Typography>
                </Box>

                {/* Fecha de Vencimiento de Almacenamiento */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Icon icon="eva:archive-outline" width={12} />
                      Vencimiento de Almacenamiento
                    </Box>
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    sx={{ 
                      color: (() => {
                        if (!order.storagePeriodMonths) {
                          return 'text.disabled';
                        }
                        const baseDate = storageBaseDate;
                        if (!baseDate) return 'text.disabled';
                        const storageExpiration = addMonths(new Date(baseDate), order.storagePeriodMonths);
                        const daysRemaining = differenceInDays(storageExpiration, new Date());
                        if (daysRemaining < 0) return 'error.main';
                        if (daysRemaining <= 3) return 'error.main';
                        if (daysRemaining <= 7) return 'warning.main';
                        return 'text.primary';
                      })()
                    }}
                  >
                    {(() => {
                      if (!order.storagePeriodMonths) {
                        return 'Sin período de almacenamiento';
                      }
                      
                      // Usar fecha de entrega si existe, sino fecha de completado, sino fecha de creación
                      const baseDate = storageBaseDate;
                      if (!baseDate) return 'Se calculará al marcarlo como reparado';
                      const storageExpiration = addMonths(new Date(baseDate), order.storagePeriodMonths);
                      const daysRemaining = differenceInDays(storageExpiration, new Date());
                      const dateText = format(storageExpiration, 'dd \'de\' MMMM \'de\' yyyy', { locale: es });
                      
                      if (daysRemaining < 0) {
                        return `${dateText} (Vencido hace ${Math.abs(daysRemaining)} días)`;
                      } else if (daysRemaining === 0) {
                        return `${dateText} (Vence hoy)`;
                      } else if (daysRemaining <= 7) {
                        return `${dateText} (${daysRemaining} días restantes)`;
                      } else {
                        return dateText;
                      }
                    })()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Historial de Estado */}
          {order.statusNotes && (
            <Card variant="outlined">
              <CardHeader
                avatar={<Icon icon="eva:clock-outline" width={20} />}
                title={`Historial de Estados ${Array.isArray(order.statusNotes) ? `(${order.statusNotes.length})` : '(1)'}`}
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Manejar formato legacy (string) y nuevo formato (array) */}
                  {Array.isArray(order.statusNotes) ? (
                    // Nuevo formato: arreglo de StatusNote
                    order.statusNotes
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((statusNote: StatusNote, index) => (
                    <Box 
                      key={statusNote.id}
                      sx={{ 
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: index === 0 ? 'primary.50' : 'grey.50',
                        border: '1px solid',
                        borderColor: index === 0 ? 'primary.200' : 'grey.200',
                        position: 'relative'
                      }}
                    >
                      {index === 0 && (
                        <Chip
                          label="Más reciente"
                          size="small"
                          color="primary"
                          sx={{ 
                            position: 'absolute',
                            top: -8,
                            right: 8,
                            fontSize: '0.65rem'
                          }}
                        />
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {statusNote.previousStatus && (
                          <>
                            <Chip
                              label={getStatusLabel(statusNote.previousStatus)}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                            <Icon icon="eva:arrow-right-outline" width={16} />
                          </>
                        )}
                        <Chip
                          label={getStatusLabel(statusNote.newStatus)}
                          size="small"
                          color="primary"
                          variant={index === 0 ? "filled" : "outlined"}
                        />
                      </Box>
                      
                      {statusNote.note && (
                        <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                          "{statusNote.note}"
                        </Typography>
                      )}
                      
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(statusNote.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </Typography>
                    </Box>
                      ))
                  ) : (
                    // Formato legacy: string simple
                    <Box 
                      sx={{ 
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={getStatusLabel(order.status)}
                          size="small"
                          color="primary"
                        />
                        <Chip
                          label="Formato Legacy"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                        "{order.statusNotes as string}"
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        Última actualización: {format(new Date(order.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Historial de Garantías */}
          <WarrantyClaimHistory 
            claims={order.warrantyClaims || []}
            readonly={false}
            loading={loading}
            onAddClaim={async (claimData) => {
              try {
                const result = await createWarrantyClaim(claimData);
                
                if (result && result.order) {
                  // Actualizar la orden en el estado padre
                  if (onOrderUpdate) {
                    onOrderUpdate(result.order);
                  }
                  
                  // Mostrar mensaje de éxito
                  setSnackbarMessage('Reclamo de garantía registrado exitosamente');
                  setSnackbarSeverity('success');
                  setSnackbarOpen(true);
                }
              } catch (error) {
                console.error('Error creating warranty claim:', error);
                setSnackbarMessage('Error al registrar el reclamo de garantía');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
              }
            }}
            onUpdateClaim={async (claimId, claimData) => {
              try {
                const result = await updateWarrantyClaim(claimId, claimData);
                if (result) {
                  if (onOrderUpdate) {
                    onOrderUpdate(result);
                  }
                  setSnackbarMessage('Reclamo de garantía actualizado');
                  setSnackbarSeverity('success');
                  setSnackbarOpen(true);
                }
              } catch (error) {
                console.error('Error updating warranty claim:', error);
                setSnackbarMessage('Error al actualizar el reclamo de garantía');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', bottom: 0, zIndex: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Icon icon="eva:printer-outline" />}
          onClick={() => onPrintReceipt?.(order)}
        >
          Imprimir comprobante
        </Button>
      </DialogActions>

      {/* Visor interno de imágenes */}
      <Dialog
        open={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'grey.950',
            color: 'common.white',
            borderRadius: { xs: 0, sm: 2 },
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Typography variant="subtitle1">
            Imagen {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} de {order.images?.length || 0}
          </Typography>
          <IconButton onClick={() => setSelectedImageIndex(null)} aria-label="Cerrar visor" sx={{ color: 'common.white' }}>
            <Icon icon="eva:close-outline" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 3 }, minHeight: { xs: 320, sm: 520 } }}>
          {selectedImageIndex !== null && order.images?.[selectedImageIndex] && (
            <Box
              component="img"
              src={order.images[selectedImageIndex]}
              alt={`Imagen del dispositivo ${selectedImageIndex + 1}`}
              sx={{ maxWidth: '100%', maxHeight: { xs: '60vh', sm: '68vh' }, objectFit: 'contain', borderRadius: 1 }}
            />
          )}
          {order.images && order.images.length > 1 && selectedImageIndex !== null && (
            <>
              <IconButton
                aria-label="Imagen anterior"
                onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + order.images!.length) % order.images!.length)}
                sx={{ position: 'absolute', left: { xs: 4, sm: 16 }, color: 'common.white', bgcolor: 'rgba(0,0,0,.45)', '&:hover': { bgcolor: 'rgba(0,0,0,.7)' } }}
              >
                <Icon icon="eva:arrow-ios-back-outline" />
              </IconButton>
              <IconButton
                aria-label="Imagen siguiente"
                onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % order.images!.length)}
                sx={{ position: 'absolute', right: { xs: 4, sm: 16 }, color: 'common.white', bgcolor: 'rgba(0,0,0,.45)', '&:hover': { bgcolor: 'rgba(0,0,0,.7)' } }}
              >
                <Icon icon="eva:arrow-ios-forward-outline" />
              </IconButton>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: 'rgba(0,0,0,.25)' }}>
          <Button
            onClick={() => setSelectedImageIndex(null)}
            variant="outlined"
            color="inherit"
            startIcon={<Icon icon="eva:close-outline" />}
            sx={{ borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,.08)' } }}
          >
            Cerrar visor
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="grey.300" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Usa las flechas para navegar
            </Typography>
            {selectedImageIndex !== null && order.images?.[selectedImageIndex] && (
              <Button
                component="a"
                href={order.images[selectedImageIndex]}
                target="_blank"
                rel="noreferrer"
                color="inherit"
                startIcon={<Icon icon="eva:external-link-outline" />}
              >
                Abrir original
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mostrar mensajes */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
