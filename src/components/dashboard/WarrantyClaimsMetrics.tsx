import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
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
  Paper,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import { Icon } from '@iconify/react';
import { RepairOrder, WarrantyClaim } from '@/types/repair';
import { format, formatDistanceToNow, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface WarrantyMetrics {
  totalOrders: number;
  ordersWithWarranty: number;
  totalClaims: number;
  claimRate: number;
  averageClaimsPerOrder: number;
  claimsByDeviceType: Array<{
    deviceType: string;
    totalOrders: number;
    totalClaims: number;
    claimRate: number;
  }>;
  claimsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recentClaims: WarrantyClaim[];
  topClaimReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

interface WarrantyClaimsMetricsProps {
  showTitle?: boolean;
  dateRange?: { from: Date; to: Date };
  maxRecentClaims?: number;
}

export default function WarrantyClaimsMetrics({ 
  showTitle = true, 
  dateRange,
  maxRecentClaims = 5 
}: WarrantyClaimsMetricsProps) {
  const [metrics, setMetrics] = useState<WarrantyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);

  useEffect(() => {
    fetchWarrantyMetrics();
  }, [dateRange]);

  const fetchWarrantyMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (dateRange?.from) {
        searchParams.set('dateFrom', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        searchParams.set('dateTo', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/warranty/metrics?${searchParams.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo métricas de garantía');
      }

      setMetrics(result.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching warranty metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClaimRateColor = (rate: number) => {
    if (rate <= 5) return 'success';
    if (rate <= 15) return 'warning';
    return 'error';
  };

  const getClaimStatusConfig = (status: string) => {
    const configs = {
      'pending': { color: 'warning', icon: 'eva:clock-outline', label: 'Pendiente' },
      'in_review': { color: 'info', icon: 'eva:eye-outline', label: 'En Revisión' },
      'resolved': { color: 'success', icon: 'eva:checkmark-circle-outline', label: 'Resuelto' },
      'rejected': { color: 'error', icon: 'eva:close-circle-outline', label: 'Rechazado' }
    };

    return configs[status as keyof typeof configs] || {
      color: 'default',
      icon: 'eva:question-mark-circle-outline',
      label: status
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleDeviceTypeClick = (deviceType: string) => {
    setSelectedDeviceType(deviceType);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:shield-outline" width={24} />}
            title="Métricas de Garantías"
            subheader="Cargando métricas..."
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
            title="Métricas de Garantías"
            subheader="Error al cargar"
          />
        )}
        <CardContent>
          <Alert severity="error">
            Error cargando métricas de garantía: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent>
          <Typography>No hay datos disponibles</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:shield-outline" width={24} />}
            title="Métricas de Garantías"
            subheader={`${metrics.totalClaims} reclamos de ${metrics.ordersWithWarranty} órdenes con garantía`}
            action={
              <Button
                variant="outlined"
                size="small"
                startIcon={<Icon icon="eva:refresh-outline" />}
                onClick={fetchWarrantyMetrics}
              >
                Actualizar
              </Button>
            }
          />
        )}
        
        <CardContent>
          {/* Métricas Principales */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {metrics.totalClaims}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Reclamos
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  fontWeight="bold" 
                  color={`${getClaimRateColor(metrics.claimRate)}.main`}
                >
                  {(metrics.claimRate || 0).toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tasa de Reclamos
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {metrics.ordersWithWarranty}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Con Garantía
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="secondary.main">
                  {(metrics.averageClaimsPerOrder || 0).toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Promedio por Orden
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Alerta si la tasa es alta */}
          {metrics.claimRate > 15 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Tasa de Reclamos Alta</AlertTitle>
              La tasa de reclamos de garantía ({(metrics.claimRate || 0).toFixed(1)}%) está por encima del 15%. 
              Considera revisar los procesos de calidad.
            </Alert>
          )}

          {/* Reclamos por Tipo de Dispositivo */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Icon icon="eva:bar-chart-outline" width={20} style={{ marginRight: 8 }} />
              Reclamos por Tipo de Dispositivo
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Dispositivo</TableCell>
                    <TableCell align="right">Órdenes</TableCell>
                    <TableCell align="right">Reclamos</TableCell>
                    <TableCell align="right">Tasa</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.claimsByDeviceType
                    .sort((a, b) => b.claimRate - a.claimRate)
                    .map((item) => (
                    <TableRow 
                      key={item.deviceType}
                      hover
                      onClick={() => handleDeviceTypeClick(item.deviceType)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell component="th" scope="row">
                        <Typography variant="subtitle2">
                          {item.deviceType}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.totalOrders}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.totalClaims}
                          color={item.totalClaims > 0 ? 'warning' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(item.claimRate || 0).toFixed(1)}%`}
                          color={getClaimRateColor(item.claimRate)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <Icon icon="eva:arrow-forward-outline" width={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Reclamos por Estado */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Icon icon="eva:pie-chart-outline" width={20} style={{ marginRight: 8 }} />
                Estado de Reclamos
              </Typography>
              
              <List>
                {metrics.claimsByStatus.map((item) => {
                  const config = getClaimStatusConfig(item.status);
                  return (
                    <ListItem key={item.status}>
                      <ListItemIcon>
                        <Icon 
                          icon={config.icon} 
                          width={20} 
                          color={`${config.color}.main`}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {config.label}
                            </Typography>
                            <Chip
                              label={item.count}
                              color={config.color}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={`${(item.percentage || 0).toFixed(1)}% del total`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                <Icon icon="eva:list-outline" width={20} style={{ marginRight: 8 }} />
                Principales Razones
              </Typography>
              
              <List>
                {metrics.topClaimReasons.slice(0, 5).map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Chip
                        label={(index + 1).toString()}
                        color="primary"
                        size="small"
                        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.reason}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption">
                            {item.count} casos ({(item.percentage || 0).toFixed(1)}%)
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{ flexGrow: 1, height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>

          {/* Reclamos Recientes */}
          {metrics.recentClaims.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                <Icon icon="eva:clock-outline" width={20} style={{ marginRight: 8 }} />
                Reclamos Recientes
              </Typography>
              
              <List>
                {metrics.recentClaims.slice(0, maxRecentClaims).map((claim, index) => {
                  const config = getClaimStatusConfig(claim.status);
                  return (
                    <React.Fragment key={claim.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon>
                          <Icon 
                            icon={config.icon} 
                            width={20} 
                            color={`${config.color}.main`}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle2">
                                {claim.reason}
                              </Typography>
                              <Chip
                                label={config.label}
                                color={config.color}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Técnico: {claim.technician}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(claim.date), { addSuffix: true, locale: es })}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < metrics.recentClaims.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          )}

          {/* Acciones */}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:download-outline" />}
            >
              Exportar Reporte
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:settings-outline" />}
            >
              Configurar Alertas
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog de Detalles por Tipo de Dispositivo */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Detalles de Reclamos - {selectedDeviceType}
        </DialogTitle>
        <DialogContent>
          {selectedDeviceType && (
            <Box>
              {(() => {
                const deviceData = metrics?.claimsByDeviceType.find(
                  item => item.deviceType === selectedDeviceType
                );
                if (!deviceData) return null;

                return (
                  <Box>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold" color="primary">
                            {deviceData.totalOrders}
                          </Typography>
                          <Typography variant="caption">Total Órdenes</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold" color="warning.main">
                            {deviceData.totalClaims}
                          </Typography>
                          <Typography variant="caption">Reclamos</Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Alert 
                      severity={getClaimRateColor(deviceData.claimRate)} 
                      sx={{ mb: 2 }}
                    >
                      <AlertTitle>Tasa de Reclamos: {(deviceData.claimRate || 0).toFixed(1)}%</AlertTitle>
                      {deviceData.claimRate > 15 ? 
                        'Esta tasa está por encima del promedio recomendado (15%).' :
                        'Esta tasa está dentro del rango aceptable.'
                      }
                    </Alert>

                    <Typography variant="subtitle2" gutterBottom>
                      Recomendaciones:
                    </Typography>
                    <List dense>
                      {deviceData.claimRate > 20 && (
                        <ListItem>
                          <ListItemIcon>
                            <Icon icon="eva:alert-triangle-outline" width={16} color="error" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Revisar proceso de reparación para este tipo de dispositivo"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      )}
                      {deviceData.claimRate > 10 && (
                        <ListItem>
                          <ListItemIcon>
                            <Icon icon="eva:book-outline" width={16} color="warning" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Capacitar técnicos en reparación especializada"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemIcon>
                          <Icon icon="eva:shield-outline" width={16} color="info" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Implementar checklist de calidad antes de la entrega"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    </List>
                  </Box>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Cerrar
          </Button>
          <Button variant="contained">
            Ver Órdenes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}