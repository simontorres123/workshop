import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  Stack,
  Divider,
  InputAdornment,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useRepairedOrders } from '@/hooks/useRepairedOrders';
import { getStorageStatsByDeviceType } from '@/utils/storageAlerts';
import { RepairOrder } from '@/types/repair';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface StorageCostCalculatorProps {
  showTitle?: boolean;
  costPerDay?: number;
  freeDays?: number;
}

interface CostProjection {
  days: number;
  totalCost: number;
  additionalCost: number;
}

export default function StorageCostCalculator({ 
  showTitle = true,
  costPerDay: initialCostPerDay = 50,
  freeDays: initialFreeDays = 7
}: StorageCostCalculatorProps) {
  const { repairedOrders, storageData, loading, error } = useRepairedOrders();
  const [costPerDay, setCostPerDay] = useState(initialCostPerDay);
  const [freeDays, setFreeDays] = useState(initialFreeDays);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [projectionDays, setProjectionDays] = useState(30);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const calculateOrderCost = (order: RepairOrder) => {
    if (!order.completedAt) return 0;
    const today = new Date();
    const completedDate = new Date(order.completedAt);
    const daysInStorage = differenceInDays(today, completedDate);
    return Math.max(0, daysInStorage - freeDays) * costPerDay;
  };

  const calculateProjectedCost = (order: RepairOrder, days: number): CostProjection => {
    if (!order.completedAt) return { days: 0, totalCost: 0, additionalCost: 0 };
    
    const today = new Date();
    const completedDate = new Date(order.completedAt);
    const currentDaysInStorage = differenceInDays(today, completedDate);
    const futureDaysInStorage = currentDaysInStorage + days;
    
    const currentCost = Math.max(0, currentDaysInStorage - freeDays) * costPerDay;
    const futureCost = Math.max(0, futureDaysInStorage - freeDays) * costPerDay;
    
    return {
      days: futureDaysInStorage,
      totalCost: futureCost,
      additionalCost: futureCost - currentCost
    };
  };

  const getTotalCurrentCost = () => {
    return repairedOrders.reduce((total, order) => total + calculateOrderCost(order), 0);
  };

  const getTotalProjectedCost = () => {
    return repairedOrders.reduce((total, order) => {
      const projection = calculateProjectedCost(order, projectionDays);
      return total + projection.additionalCost;
    }, 0);
  };

  const getOrdersByRisk = () => {
    const today = new Date();
    const orders = repairedOrders.map(order => {
      const daysInStorage = order.completedAt ? 
        differenceInDays(today, new Date(order.completedAt)) : 0;
      const currentCost = calculateOrderCost(order);
      const projection30 = calculateProjectedCost(order, 30);
      
      return {
        ...order,
        daysInStorage,
        currentCost,
        projectedCost: projection30.totalCost,
        riskLevel: currentCost > 1000 ? 'high' : currentCost > 300 ? 'medium' : 'low'
      };
    });

    return {
      high: orders.filter(o => o.riskLevel === 'high').sort((a, b) => b.currentCost - a.currentCost),
      medium: orders.filter(o => o.riskLevel === 'medium').sort((a, b) => b.currentCost - a.currentCost),
      low: orders.filter(o => o.riskLevel === 'low').sort((a, b) => b.currentCost - a.currentCost)
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return 'Desconocido';
    }
  };

  const handleOrderClick = (order: RepairOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:calculator-outline" width={24} />}
            title="Calculadora de Costos de Almacenamiento"
            subheader="Cargando datos..."
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
            title="Calculadora de Costos de Almacenamiento"
            subheader="Error al cargar"
          />
        )}
        <CardContent>
          <Alert severity="error">
            Error cargando datos de almacenamiento: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const ordersByRisk = getOrdersByRisk();
  const totalCurrentCost = getTotalCurrentCost();
  const totalProjectedCost = getTotalProjectedCost();
  const averageCostPerOrder = repairedOrders.length > 0 ? totalCurrentCost / repairedOrders.length : 0;

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:calculator-outline" width={24} />}
            title="Calculadora de Costos de Almacenamiento"
            subheader={`${repairedOrders.length} aparatos en almacén • Costo actual: ${formatCurrency(totalCurrentCost)}`}
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="eva:trending-up-outline" />}
                  onClick={() => setSimulationOpen(true)}
                >
                  Simular
                </Button>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<Icon icon="eva:settings-outline" />}
                >
                  Config
                </Button>
              </Stack>
            }
          />
        )}
        
        <CardContent>
          {/* Configuración Actual */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Configuración Actual
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Costo por día: <strong>{formatCurrency(costPerDay)}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Días gratuitos: <strong>{freeDays} días</strong>
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Métricas Principales */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {formatCurrency(totalCurrentCost)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Costo Total Actual
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  {formatCurrency(averageCostPerOrder)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Promedio por Orden
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {ordersByRisk.high.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Riesgo Alto
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="info.main">
                  {formatCurrency(totalProjectedCost)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Costo Proyectado (30d)
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Alerta de Costos Altos */}
          {totalCurrentCost > 5000 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Costos de Almacenamiento Elevados</AlertTitle>
              Los costos actuales ({formatCurrency(totalCurrentCost)}) están por encima del límite recomendado. 
              Se sugiere contactar urgentemente a los clientes.
            </Alert>
          )}

          {/* Órdenes por Nivel de Riesgo */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Icon icon="eva:alert-triangle-outline" width={20} style={{ marginRight: 8 }} />
              Órdenes por Nivel de Riesgo de Costo
            </Typography>

            {/* Riesgo Alto */}
            {ordersByRisk.high.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Icon icon="eva:alert-circle-fill" width={16} color="error.main" />
                  <Typography variant="subtitle2" color="error.main" fontWeight="bold">
                    Riesgo Alto ({ordersByRisk.high.length} órdenes)
                  </Typography>
                </Box>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Folio</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Dispositivo</TableCell>
                        <TableCell align="right">Días</TableCell>
                        <TableCell align="right">Costo Actual</TableCell>
                        <TableCell align="right">Proyección 30d</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ordersByRisk.high.slice(0, 5).map((order) => (
                        <TableRow 
                          key={order.id}
                          hover
                          onClick={() => handleOrderClick(order)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {order.folio}
                            </Typography>
                          </TableCell>
                          <TableCell>{order.clientName}</TableCell>
                          <TableCell>{order.deviceType}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${order.daysInStorage}d`}
                              color="error"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" color="error" fontWeight="bold">
                              {formatCurrency(order.currentCost)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="warning.main">
                              {formatCurrency(order.projectedCost)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Contactar cliente">
                              <Button
                                size="small"
                                color="error"
                                startIcon={<Icon icon="eva:phone-outline" width={14} />}
                              >
                                Llamar
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Riesgo Medio y Bajo - Resumen */}
            <Grid container spacing={2}>
              {ordersByRisk.medium.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Icon icon="eva:alert-triangle-outline" width={16} color="warning.main" />
                      <Typography variant="subtitle2" color="warning.main">
                        Riesgo Medio ({ordersByRisk.medium.length})
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Costo promedio: {formatCurrency(
                        ordersByRisk.medium.reduce((sum, o) => sum + o.currentCost, 0) / ordersByRisk.medium.length
                      )}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {ordersByRisk.low.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Icon icon="eva:checkmark-circle-outline" width={16} color="success.main" />
                      <Typography variant="subtitle2" color="success.main">
                        Riesgo Bajo ({ordersByRisk.low.length})
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Costo promedio: {formatCurrency(
                        ordersByRisk.low.reduce((sum, o) => sum + o.currentCost, 0) / ordersByRisk.low.length
                      )}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Acciones */}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:phone-outline" />}
              disabled={ordersByRisk.high.length === 0}
            >
              Contactar Riesgo Alto
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:download-outline" />}
            >
              Exportar Reporte
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog de Simulación */}
      <Dialog open={simulationOpen} onClose={() => setSimulationOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Simulador de Costos de Almacenamiento
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Configuración */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <TextField
                  label="Costo por día"
                  type="number"
                  value={costPerDay}
                  onChange={(e) => setCostPerDay(Number(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  fullWidth
                />
                <TextField
                  label="Días gratuitos"
                  type="number"
                  value={freeDays}
                  onChange={(e) => setFreeDays(Number(e.target.value))}
                  fullWidth
                />
                <TextField
                  label="Proyección (días)"
                  type="number"
                  value={projectionDays}
                  onChange={(e) => setProjectionDays(Number(e.target.value))}
                  fullWidth
                />
              </Stack>
            </Grid>

            {/* Resultados */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Proyección de Costos
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {formatCurrency(getTotalCurrentCost())}
                    </Typography>
                    <Typography variant="caption">Costo Actual</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                      {formatCurrency(getTotalProjectedCost())}
                    </Typography>
                    <Typography variant="caption">Costo Adicional</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="info">
                Con la configuración actual, el costo total sería de{' '}
                <strong>{formatCurrency(getTotalCurrentCost() + getTotalProjectedCost())}</strong>{' '}
                en {projectionDays} días.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationOpen(false)}>
            Cerrar
          </Button>
          <Button variant="contained">
            Aplicar Configuración
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalles de Orden */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Detalles de Costo - {selectedOrder?.folio}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">Cliente</TableCell>
                    <TableCell>{selectedOrder.clientName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Dispositivo</TableCell>
                    <TableCell>{selectedOrder.deviceType}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Completado</TableCell>
                    <TableCell>
                      {selectedOrder.completedAt ? 
                        format(new Date(selectedOrder.completedAt), 'dd/MM/yyyy') : 
                        'N/A'
                      }
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Días en almacén</TableCell>
                    <TableCell>
                      {selectedOrder.completedAt ? 
                        differenceInDays(new Date(), new Date(selectedOrder.completedAt)) : 
                        0
                      } días
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Costo actual</TableCell>
                    <TableCell>
                      <Typography variant="h6" color="error" fontWeight="bold">
                        {formatCurrency(calculateOrderCost(selectedOrder))}
                      </Typography>
                    </TableCell>
                  </TableRow>
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
            Contactar Cliente
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}