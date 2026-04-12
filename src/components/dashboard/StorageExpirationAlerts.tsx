import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  AlertTitle,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Stack,
  LinearProgress,
  Divider
} from '@mui/material';
import { Icon } from '@iconify/react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStorageGroupedOrders } from '@/hooks/useRepairedOrders';
import { getStorageAlertAppearance } from '@/utils/storageAlerts';
import { RepairOrder } from '@/types/repair';

interface StorageExpirationAlertsProps {
  maxItemsToShow?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export default function StorageExpirationAlerts({ 
  maxItemsToShow = 5, 
  showTitle = true,
  compact = false 
}: StorageExpirationAlertsProps) {
  const { groupedOrders, storageData, loading, error } = useStorageGroupedOrders();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:archive-outline" width={24} />}
            title="Alertas de Almacenamiento"
            subheader="Cargando alertas..."
          />
        )}
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:alert-triangle-outline" width={24} color="error" />}
            title="Alertas de Almacenamiento"
            subheader="Error al cargar"
          />
        )}
        <CardContent>
          <Alert severity="error">
            Error cargando alertas de almacenamiento: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = (storageData?.totalAlertsCount || 0);
  const criticalCount = (storageData?.criticalAlertsCount || 0);
  const warningCount = totalAlerts - criticalCount;

  const handleOrderClick = (order: RepairOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const getOrderAlert = (order: RepairOrder) => {
    return storageData?.storageAlerts.find(alert => alert.id === order.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader
            avatar={
              <Icon 
                icon={totalAlerts > 0 ? "eva:alert-triangle-outline" : "eva:archive-outline"} 
                width={24} 
                color={criticalCount > 0 ? "error" : totalAlerts > 0 ? "warning" : "success"}
              />
            }
            title="Alertas de Almacenamiento"
            subheader={`${totalAlerts} alertas activas • ${groupedOrders.safe.length + groupedOrders.warning.length + groupedOrders.critical.length} aparatos en almacén`}
            action={
              totalAlerts > 0 && (
                <Stack direction="row" spacing={1}>
                  {criticalCount > 0 && (
                    <Chip
                      label={`${criticalCount} críticas`}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {warningCount > 0 && (
                    <Chip
                      label={`${warningCount} advertencias`}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              )
            }
          />
        )}
        
        <CardContent>
          {totalAlerts === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Todo en orden</AlertTitle>
              No hay aparatos próximos a vencer el período de almacenamiento gratuito.
            </Alert>
          ) : (
            <>
              {/* Alertas Críticas */}
              {groupedOrders.critical.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <AlertTitle>Atención Urgente Requerida</AlertTitle>
                    {groupedOrders.critical.length} aparatos necesitan ser recogidos inmediatamente.
                  </Alert>
                  
                  <List dense={compact}>
                    {groupedOrders.critical.slice(0, maxItemsToShow).map((order) => {
                      const alert = getOrderAlert(order);
                      const appearance = alert ? getStorageAlertAppearance(alert.severity, alert.daysRemaining) : null;
                      
                      return (
                        <ListItem
                          key={order.id}
                          button
                          onClick={() => handleOrderClick(order)}
                          sx={{
                            bgcolor: 'error.lighter',
                            borderRadius: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'error.light'
                          }}
                        >
                          <ListItemIcon>
                            <Icon 
                              icon={appearance?.icon || "eva:alert-triangle-fill"} 
                              width={20} 
                              color="error.main" 
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {order.folio} - {order.clientName}
                                </Typography>
                                <Chip
                                  label={alert?.daysRemaining! < 0 ? 'VENCIDO' : `${alert?.daysRemaining} días`}
                                  color="error"
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {order.deviceType} • Completado: {order.completedAt ? format(new Date(order.completedAt), 'dd/MM/yyyy') : 'N/A'}
                                </Typography>
                                {alert?.estimatedCost && alert.estimatedCost > 0 && (
                                  <Typography variant="caption" color="error.main" fontWeight="bold">
                                    Costo acumulado: {formatCurrency(alert.estimatedCost)}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton size="small">
                              <Icon icon="eva:arrow-forward-outline" width={16} />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {/* Alertas de Advertencia */}
              {groupedOrders.warning.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    <Icon icon="eva:clock-outline" width={20} style={{ marginRight: 8 }} />
                    Próximos a Vencer ({groupedOrders.warning.length})
                  </Typography>
                  
                  <List dense={compact}>
                    {groupedOrders.warning.slice(0, maxItemsToShow).map((order) => {
                      const alert = getOrderAlert(order);
                      
                      return (
                        <ListItem
                          key={order.id}
                          button
                          onClick={() => handleOrderClick(order)}
                          sx={{
                            bgcolor: 'warning.lighter',
                            borderRadius: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'warning.light'
                          }}
                        >
                          <ListItemIcon>
                            <Icon icon="eva:clock-outline" width={20} color="warning.main" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2">
                                  {order.folio} - {order.clientName}
                                </Typography>
                                <Chip
                                  label={`${alert?.daysRemaining} días`}
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={`${order.deviceType} • ${alert?.message}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {/* Resumen de costos */}
              {storageData && storageData.totalStorageCost > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resumen de Costos de Almacenamiento
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {formatCurrency(storageData.totalStorageCost)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Costo total acumulado por almacenamiento prolongado
                  </Typography>
                </Box>
              )}

              {/* Acciones */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="eva:phone-outline" />}
                  disabled={totalAlerts === 0}
                >
                  Contactar Clientes
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="eva:download-outline" />}
                  disabled={totalAlerts === 0}
                >
                  Exportar Lista
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalles */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles de Almacenamiento - {selectedOrder?.folio}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Cliente</TableCell>
                    <TableCell>{selectedOrder.clientName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Teléfono</TableCell>
                    <TableCell>{selectedOrder.clientPhone}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Dispositivo</TableCell>
                    <TableCell>{selectedOrder.deviceType} - {selectedOrder.deviceBrand}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Completado</TableCell>
                    <TableCell>
                      {selectedOrder.completedAt ? 
                        format(new Date(selectedOrder.completedAt), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                        'N/A'
                      }
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Tiempo en Almacén</TableCell>
                    <TableCell>
                      {selectedOrder.completedAt ? 
                        formatDistanceToNow(new Date(selectedOrder.completedAt), { addSuffix: true, locale: es }) : 
                        'N/A'
                      }
                    </TableCell>
                  </TableRow>
                  {(() => {
                    const alert = getOrderAlert(selectedOrder);
                    return alert && (
                      <>
                        <TableRow>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                          <TableCell>
                            <Chip
                              label={alert.daysRemaining < 0 ? 'Vencido' : `${alert.daysRemaining} días restantes`}
                              color={alert.severity === 'critical' ? 'error' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                        {alert.estimatedCost && alert.estimatedCost > 0 && (
                          <TableRow>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Costo Almacenamiento</TableCell>
                            <TableCell>
                              <Typography variant="subtitle2" color="error" fontWeight="bold">
                                {formatCurrency(alert.estimatedCost)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Cerrar
          </Button>
          <Button variant="contained" startIcon={<Icon icon="eva:phone-outline" />}>
            Llamar Cliente
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}