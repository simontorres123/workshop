import React, { useState, useEffect, Suspense } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import { Icon } from '@iconify/react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Importar componentes originales - TODOS RESTAURADOS
import StorageExpirationAlerts from './StorageExpirationAlerts';
import RepairStatusOverview from './RepairStatusOverview';
import WarrantyClaimsMetrics from './WarrantyClaimsMetrics';
import StorageCostCalculator from './StorageCostCalculator';
import WarrantyReports from './WarrantyReports';
import WarrantyReportViewer from './WarrantyReportViewer';
import ConfigurationPanel from './ConfigurationPanel';
import AdvancedFilters from './AdvancedFilters';
import QuickActionsPanel from './QuickActionsPanel';
import ReportExportDialog from './ReportExportDialog';
import AlertConfigurationPanel from './AlertConfigurationPanel';

// Hooks originales
import { useRepairedOrders, useStorageStats } from '@/hooks/useRepairedOrders';
import { useWarrantyClaims } from '@/hooks/useWarrantyClaims';

// Skeleton loaders para componentes pesados
import { 
  SkeletonLoader, 
  TableSkeleton, 
  ChartSkeleton, 
  ListSkeleton,
  StatCardSkeleton 
} from '@/components/ui/SkeletonLoader';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import NotificationCenter from './NotificationCenter';

// Interfaces originales
interface DashboardFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  deviceType?: string;
  urgentOnly?: boolean;
  showCosts?: boolean;
}

interface QuickStats {
  totalRepairedWaiting: number;
  warrantyClaimsTotal: number;
  criticalStorageAlerts: number;
  totalStorageCost: number;
  urgentActions: number;
}

// Wrapper asíncrono para componentes pesados
const AsyncComponentWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}> = ({ children, fallback = <SkeletonLoader />, delay = 200 }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isReady) return <>{fallback}</>;
  return <>{children}</>;
};

export default function AsyncWarrantyStorageDashboard() {
  // Estados originales restaurados
  const [filters, setFilters] = useState<DashboardFilters>({
    urgentOnly: false,
    showCosts: true
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalRepairedWaiting: 0,
    warrantyClaimsTotal: 0,
    criticalStorageAlerts: 0,
    totalStorageCost: 0,
    urgentActions: 0
  });

  // Estados para diálogos - TODOS RESTAURADOS
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [warrantyReportOpen, setWarrantyReportOpen] = useState(false);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  // Hooks originales restaurados
  const { repairedOrders: orders, loading: ordersLoading, error: ordersError, refreshData: fetchOrders } = useRepairedOrders();
  const { stats, loading: statsLoading } = useStorageStats();
  const { loading: warrantyLoading } = useWarrantyClaims('');

  // Efectos originales restaurados
  useEffect(() => {
    if (fetchOrders && typeof fetchOrders === 'function') {
      fetchOrders();
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      setQuickStats(prev => ({
        ...prev,
        totalRepairedWaiting: orders.length,
        urgentActions: orders.filter(order => {
          const daysSinceCompleted = Math.floor(
            (Date.now() - new Date(order.completedAt || order.createdAt).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          return daysSinceCompleted > 7;
        }).length
      }));
    }
  }, [orders]);

  // Funciones originales restauradas
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const urgency = quickStats.urgentActions > 5 
    ? { color: 'error' as const, message: 'Atención requerida: múltiples aparatos con tiempo crítico en almacén' }
    : quickStats.totalRepairedWaiting > 3
    ? { color: 'warning' as const, message: 'Aparatos esperando entrega - revisar inventario regularmente' }
    : { color: 'success' as const, message: 'Sistema funcionando normalmente' };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        {/* Header original restaurado */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: { xs: 2, sm: 0 } }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
                Dashboard de Garantías y Almacén
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monitoreo integral de reparaciones, garantías y notificaciones push
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Actualizar datos">
                <IconButton
                  onClick={handleRefresh}
                  disabled={refreshing}
                  color="primary"
                  sx={{ 
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                  }}
                >
                  <Icon icon="eva:refresh-outline" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filtros avanzados">
                <IconButton
                  onClick={() => setFiltersOpen(true)}
                  color={filtersOpen ? 'primary' : 'default'}
                >
                  <Icon icon="eva:funnel-outline" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Botones de acción - RESTAURADOS */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1} 
              justifyContent="center"
              alignItems="stretch"
            >
              <Button
                variant="outlined"
                startIcon={<Icon icon="eva:file-text-outline" />}
                onClick={() => setWarrantyReportOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 200 } }}
              >
                Ver Reporte Completo
              </Button>
              <Button
                variant="outlined"
                startIcon={<Icon icon="eva:download-outline" />}
                onClick={() => setReportExportOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 150 } }}
              >
                Exportar
              </Button>
              <Button
                variant="outlined"
                startIcon={<Icon icon="eva:bell-outline" />}
                onClick={() => setNotificationCenterOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 160 } }}
              >
                Notificaciones
              </Button>
              <Button
                variant="outlined"
                startIcon={<Icon icon="eva:settings-outline" />}
                onClick={() => setConfigPanelOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 150 } }}
              >
                Configuración
              </Button>
            </Stack>
          </Paper>

          {/* Alerta de Estado General - RESTAURADA */}
          <Alert severity={urgency.color} sx={{ mb: 2 }}>
            <AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:info-outline" width={20} />
                Estado General del Sistema
              </Box>
            </AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography>{urgency.message}</Typography>
              <Stack direction="row" spacing={1}>
                {quickStats.urgentActions > 0 && (
                  <Chip
                    label={`${quickStats.urgentActions} acciones urgentes`}
                    color={urgency.color}
                    size="small"
                  />
                )}
                <Chip
                  label={`${quickStats.totalRepairedWaiting} en almacén`}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Alert>
        </Box>

        {/* Métricas Rápidas - RESTAURADAS con optimización */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:pie-chart-outline" />
            Resumen Ejecutivo
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <AsyncComponentWrapper fallback={<StatCardSkeleton />} delay={100}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    p: 2.5, 
                    textAlign: 'center',
                    bgcolor: quickStats.totalRepairedWaiting > 10 ? 'warning.lighter' : 'background.paper',
                    border: quickStats.totalRepairedWaiting > 10 ? '2px solid' : 'none',
                    borderColor: 'warning.main',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Icon 
                      icon="eva:archive-outline" 
                      width={32} 
                      style={{ color: quickStats.totalRepairedWaiting > 10 ? '#ed6c02' : '#1976d2' }}
                    />
                    <Typography variant="h3" fontWeight="bold" color={quickStats.totalRepairedWaiting > 10 ? 'warning.main' : 'primary.main'}>
                      {quickStats.totalRepairedWaiting}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
                      Aparatos Esperando Entrega
                    </Typography>
                  </Box>
                </Card>
              </AsyncComponentWrapper>
            </Grid>

            {/* Resto de métricas con skeleton loaders */}
            <Grid item xs={6} sm={3}>
              <AsyncComponentWrapper fallback={<StatCardSkeleton />} delay={200}>
                <Card elevation={2} sx={{ p: 2.5, textAlign: 'center', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:shield-outline" width={32} style={{ color: '#2e7d32' }} />
                    <Typography variant="h3" fontWeight="bold" color="success.main">
                      {quickStats.warrantyClaimsTotal}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Reclamos de Garantía
                    </Typography>
                  </Box>
                </Card>
              </AsyncComponentWrapper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <AsyncComponentWrapper fallback={<StatCardSkeleton />} delay={300}>
                <Card elevation={2} sx={{ p: 2.5, textAlign: 'center', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:alert-triangle-outline" width={32} style={{ color: '#ed6c02' }} />
                    <Typography variant="h3" fontWeight="bold" color="warning.main">
                      {quickStats.criticalStorageAlerts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Alertas Críticas
                    </Typography>
                  </Box>
                </Card>
              </AsyncComponentWrapper>
            </Grid>

            <Grid item xs={6} sm={3}>
              <AsyncComponentWrapper fallback={<StatCardSkeleton />} delay={400}>
                <Card elevation={2} sx={{ p: 2.5, textAlign: 'center', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:credit-card-outline" width={32} style={{ color: '#1976d2' }} />
                    <Typography variant="h3" fontWeight="bold" color="primary.main">
                      ${quickStats.totalStorageCost.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Costo Total Almacén
                    </Typography>
                  </Box>
                </Card>
              </AsyncComponentWrapper>
            </Grid>
          </Grid>
        </Box>

        {/* Grid principal con todos los componentes RESTAURADOS pero optimizados */}
        <Grid container spacing={3}>
          {/* Alertas de Expiración */}
          <Grid item xs={12} lg={8}>
            <ErrorBoundary fallback="Error cargando alertas de almacén">
              <Suspense fallback={<ListSkeleton />}>
                <AsyncComponentWrapper delay={500}>
                  <StorageExpirationAlerts />
                </AsyncComponentWrapper>
              </Suspense>
            </ErrorBoundary>
          </Grid>

          {/* Calculadora de Costos */}
          <Grid item xs={12} lg={4}>
            <ErrorBoundary fallback="Error cargando calculadora">
              <Suspense fallback={<SkeletonLoader variant="card" height={300} />}>
                <AsyncComponentWrapper delay={600}>
                  <StorageCostCalculator />
                </AsyncComponentWrapper>
              </Suspense>
            </ErrorBoundary>
          </Grid>


          {/* Resumen de Estado de Reparaciones */}
          <Grid item xs={12} md={6}>
            <ErrorBoundary fallback="Error cargando resumen de reparaciones">
              <Suspense fallback={<ChartSkeleton />}>
                <AsyncComponentWrapper delay={700}>
                  <RepairStatusOverview />
                </AsyncComponentWrapper>
              </Suspense>
            </ErrorBoundary>
          </Grid>

          {/* Métricas de Garantía */}
          <Grid item xs={12} md={6}>
            <ErrorBoundary fallback="Error cargando métricas de garantía">
              <Suspense fallback={<ChartSkeleton />}>
                <AsyncComponentWrapper delay={800}>
                  <WarrantyClaimsMetrics />
                </AsyncComponentWrapper>
              </Suspense>
            </ErrorBoundary>
          </Grid>

          {/* Acciones Rápidas */}
          <Grid item xs={12}>
            <ErrorBoundary fallback="Error cargando acciones rápidas">
              <Suspense fallback={<TableSkeleton />}>
                <AsyncComponentWrapper delay={900}>
                  <QuickActionsPanel />
                </AsyncComponentWrapper>
              </Suspense>
            </ErrorBoundary>
          </Grid>
        </Grid>

        {/* FAB para accesos rápidos - RESTAURADO */}
        <Zoom in={true}>
          <Fab
            color="primary"
            aria-label="acciones rápidas"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={() => setConfigPanelOpen(true)}
          >
            <Icon icon="eva:plus-outline" />
          </Fab>
        </Zoom>

        {/* Diálogos - TODOS RESTAURADOS */}
        <Dialog
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Filtros Avanzados</DialogTitle>
          <DialogContent>
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFiltersOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>

        <WarrantyReportViewer
          open={warrantyReportOpen}
          onClose={() => setWarrantyReportOpen(false)}
        />

        <ReportExportDialog
          open={reportExportOpen}
          onClose={() => setReportExportOpen(false)}
        />

        <NotificationCenter
          open={notificationCenterOpen}
          onClose={() => setNotificationCenterOpen(false)}
        />

        <ConfigurationPanel
          open={configPanelOpen}
          onClose={() => setConfigPanelOpen(false)}
        />
      </Box>
    </LocalizationProvider>
  );
}