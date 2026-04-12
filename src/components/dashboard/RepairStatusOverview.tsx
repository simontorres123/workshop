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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Paper,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { RepairOrder, RepairStatus, REPAIR_STATUS_CONFIG } from '@/types/repair';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatusCount {
  status: string;
  count: number;
  orders: RepairOrder[];
  config: typeof REPAIR_STATUS_CONFIG[keyof typeof REPAIR_STATUS_CONFIG];
}

interface RepairStatusOverviewProps {
  showTitle?: boolean;
  compact?: boolean;
  maxItemsPerStatus?: number;
}

export default function RepairStatusOverview({ 
  showTitle = true, 
  compact = false,
  maxItemsPerStatus = 3 
}: RepairStatusOverviewProps) {
  const [statusData, setStatusData] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusCount | null>(null);

  useEffect(() => {
    fetchStatusData();
  }, []);

  const fetchStatusData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/repair-orders?includeAll=true');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo datos de estado');
      }

      const orders: RepairOrder[] = result.data || [];
      const statusCounts = calculateStatusCounts(orders);
      setStatusData(statusCounts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusCounts = (orders: RepairOrder[]): StatusCount[] => {
    const statusMap = new Map<string, RepairOrder[]>();

    // Agrupar órdenes por estado
    orders.forEach(order => {
      const status = order.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, []);
      }
      statusMap.get(status)!.push(order);
    });

    // Convertir a array con configuración
    const statusCounts: StatusCount[] = Array.from(statusMap.entries()).map(([status, orders]) => {
      const config = REPAIR_STATUS_CONFIG[status as keyof typeof REPAIR_STATUS_CONFIG] || {
        label: status,
        description: 'Estado desconocido',
        color: 'default' as const,
        icon: 'eva:question-mark-circle-outline',
        allowClientActions: []
      };

      return {
        status,
        count: orders.length,
        orders: orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        config
      };
    });

    // Ordenar por importancia/frecuencia
    const statusOrder = [
      RepairStatus.PENDING_DIAGNOSIS,
      RepairStatus.DIAGNOSIS_CONFIRMED,
      RepairStatus.REPAIR_ACCEPTED,
      RepairStatus.IN_REPAIR,
      RepairStatus.REPAIRED,
      RepairStatus.REPAIR_REJECTED,
      RepairStatus.DELIVERED
    ];

    return statusCounts.sort((a, b) => {
      const indexA = statusOrder.indexOf(a.status as RepairStatus);
      const indexB = statusOrder.indexOf(b.status as RepairStatus);
      
      if (indexA === -1 && indexB === -1) return b.count - a.count;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  };

  const getTotalOrders = () => {
    return statusData.reduce((total, status) => total + status.count, 0);
  };

  const getProgressPercentage = (count: number) => {
    const total = getTotalOrders();
    return total > 0 ? (count / total) * 100 : 0;
  };

  const handleStatusClick = (statusData: StatusCount) => {
    setSelectedStatus(statusData);
    setDetailsOpen(true);
  };

  const getUrgentOrders = () => {
    const urgentStatuses = [RepairStatus.PENDING_DIAGNOSIS, RepairStatus.DIAGNOSIS_CONFIRMED, RepairStatus.REPAIRED];
    return statusData
      .filter(status => urgentStatuses.includes(status.status as RepairStatus))
      .reduce((total, status) => total + status.count, 0);
  };

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
  };

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:pie-chart-outline" width={24} />}
            title="Vista General de Estados"
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
            title="Vista General de Estados"
            subheader="Error al cargar"
          />
        )}
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader
            avatar={<Icon icon="eva:pie-chart-outline" width={24} />}
            title="Vista General de Estados"
            subheader={`${getTotalOrders()} órdenes totales • ${getUrgentOrders()} requieren atención`}
            action={
              <Button
                variant="outlined"
                size="small"
                startIcon={<Icon icon="eva:refresh-outline" />}
                onClick={fetchStatusData}
              >
                Actualizar
              </Button>
            }
          />
        )}
        
        <CardContent>
          {/* Estadísticas Principales */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {getTotalOrders()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Órdenes
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {getUrgentOrders()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Requieren Atención
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {statusData.find(s => s.status === RepairStatus.REPAIRED)?.count || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reparados
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {statusData.find(s => s.status === RepairStatus.DELIVERED)?.count || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Entregados
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Lista de Estados */}
          <Box>
            {statusData.map((statusItem) => (
              <Box key={statusItem.status} sx={{ mb: 2 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 1,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleStatusClick(statusItem)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon 
                      icon={statusItem.config.icon} 
                      width={20} 
                      color={`${statusItem.config.color}.main`}
                    />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {statusItem.config.label}
                    </Typography>
                    <Chip
                      label={statusItem.count}
                      color={statusItem.config.color}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {getProgressPercentage(statusItem.count).toFixed(1)}%
                    </Typography>
                    <Icon icon="eva:arrow-forward-outline" width={16} />
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={getProgressPercentage(statusItem.count)}
                  color={statusItem.config.color}
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    mb: 1,
                    bgcolor: `${statusItem.config.color}.lighter`
                  }}
                />

                {/* Vista previa de órdenes */}
                {!compact && statusItem.count > 0 && (
                  <Box sx={{ ml: 3, mb: 1 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {statusItem.orders.slice(0, maxItemsPerStatus).map((order) => (
                        <Tooltip
                          key={order.id}
                          title={`${order.clientName} - ${order.deviceType} (${formatTimeAgo(order.createdAt)})`}
                        >
                          <Chip
                            label={order.folio}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      ))}
                      {statusItem.count > maxItemsPerStatus && (
                        <Chip
                          label={`+${statusItem.count - maxItemsPerStatus} más`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', opacity: 0.7 }}
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Dialog de Detalles por Estado */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedStatus && (
              <>
                <Icon 
                  icon={selectedStatus.config.icon} 
                  width={24} 
                  color={`${selectedStatus.config.color}.main`}
                />
                <Box>
                  <Typography variant="h6">
                    {selectedStatus.config.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedStatus.count} órdenes en este estado
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedStatus && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedStatus.config.description}
              </Typography>
              
              <List>
                {selectedStatus.orders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Icon 
                          icon="eva:file-text-outline" 
                          width={20} 
                          color="text.secondary" 
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {order.folio}
                            </Typography>
                            <Typography variant="body2">
                              {order.clientName}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {order.deviceType} {order.deviceBrand && `- ${order.deviceBrand}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Creada: {formatTimeAgo(order.createdAt)}
                              {order.estimatedDate && ` • Estimada: ${formatTimeAgo(order.estimatedDate)}`}
                            </Typography>
                            {order.totalCost && (
                              <Typography variant="caption" color="primary" display="block">
                                Costo: ${order.totalCost.toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < selectedStatus.orders.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Cerrar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Icon icon="eva:download-outline" />}
          >
            Exportar Lista
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}