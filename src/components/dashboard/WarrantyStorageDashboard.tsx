import React, { useState, useEffect } from 'react';
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

// Importar componentes creados
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

// Hooks
import { useRepairedOrders, useStorageStats } from '@/hooks/useRepairedOrders';
import { useWarrantyClaims } from '@/hooks/useWarrantyClaims';

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

export default function WarrantyStorageDashboard() {
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

  // Estados para paneles avanzados
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [alertConfigOpen, setAlertConfigOpen] = useState(false);
  const [warrantyReportOpen, setWarrantyReportOpen] = useState(false);

  // Hooks para datos
  const { storageData, loading: storageLoading, error: storageError, refreshData } = useRepairedOrders();
  const { stats: storageStats, loading: statsLoading } = useStorageStats();

  useEffect(() => {
    updateQuickStats();
  }, [storageData, storageStats]);

  const updateQuickStats = () => {
    if (!storageData) return;

    const stats: QuickStats = {
      totalRepairedWaiting: storageData.repairedWaitingPickup.length,
      warrantyClaimsTotal: 0, // Se actualizará desde la API
      criticalStorageAlerts: storageData.criticalAlertsCount,
      totalStorageCost: storageData.totalStorageCost,
      urgentActions: storageData.criticalAlertsCount + (storageData.totalStorageCost > 2000 ? 1 : 0)
    };

    setQuickStats(stats);
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      // Aquí podrías agregar más refreshes de otros componentes
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getUrgencyLevel = () => {
    if (quickStats.urgentActions > 5) return { level: 'critical', color: 'error', message: 'Atención inmediata requerida' };
    if (quickStats.urgentActions > 2) return { level: 'warning', color: 'warning', message: 'Requiere atención pronto' };
    return { level: 'good', color: 'success', message: 'Situación controlada' };
  };

  const urgency = getUrgencyLevel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box sx={{ p: 3, maxWidth: '1400px', mx: 'auto' }}>
        {/* Header del Dashboard */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'start', sm: 'center' }, justifyContent: 'space-between', mb: 3, gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:shield-outline" width={32} />
                Dashboard de Garantías y Almacenamiento
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monitor de vencimientos, costos y métricas de calidad
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Icon icon="eva:refresh-outline" />}
              onClick={handleRefreshAll}
              disabled={refreshing}
              sx={{ minWidth: 140 }}
            >
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </Box>

          {/* Barra de acciones principal */}
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <Icon icon="eva:options-outline" />
              Acciones Rápidas
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1} 
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                variant="outlined"
                startIcon={<Icon icon="eva:funnel-outline" />}
                onClick={() => setAdvancedFiltersOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 200 } }}
              >
                Filtros Avanzados
              </Button>
              <Button
                variant={quickStats.urgentActions > 0 ? "contained" : "outlined"}
                color={quickStats.urgentActions > 0 ? "error" : "primary"}
                startIcon={<Icon icon="eva:flash-outline" />}
                onClick={() => setQuickActionsOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 200 } }}
              >
                Acciones Urgentes {quickStats.urgentActions > 0 && `(${quickStats.urgentActions})`}
              </Button>
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
                onClick={() => setAlertConfigOpen(true)}
                size="small"
                sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 120 } }}
              >
                Alertas
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

          {/* Alerta de Estado General */}
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

        {/* Métricas Rápidas - Resumen Ejecutivo */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:pie-chart-outline" />
            Resumen Ejecutivo
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
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
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  bgcolor: quickStats.criticalStorageAlerts > 0 ? 'error.lighter' : 'background.paper',
                  border: quickStats.criticalStorageAlerts > 0 ? '2px solid' : 'none',
                  borderColor: 'error.main',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Icon 
                    icon="eva:alert-triangle-outline" 
                    width={32} 
                    style={{ color: quickStats.criticalStorageAlerts > 0 ? '#d32f2f' : '#666' }}
                  />
                  <Typography variant="h3" fontWeight="bold" color={quickStats.criticalStorageAlerts > 0 ? 'error.main' : 'text.secondary'}>
                    {quickStats.criticalStorageAlerts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
                    Alertas Críticas de Almacén
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:shield-outline" width={32} style={{ color: '#0288d1' }} />
                  <Typography variant="h3" fontWeight="bold" color="info.main">
                    {quickStats.warrantyClaimsTotal}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
                    Reclamos de Garantía
                  </Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  textAlign: 'center',
                  bgcolor: quickStats.totalStorageCost > 2000 ? 'error.lighter' : 'background.paper',
                  border: quickStats.totalStorageCost > 2000 ? '2px solid' : 'none',
                  borderColor: 'error.main',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Icon 
                    icon="eva:calculator-outline" 
                    width={32} 
                    style={{ color: quickStats.totalStorageCost > 2000 ? '#d32f2f' : '#ed6c02' }}
                  />
                  <Typography variant="h4" fontWeight="bold" color={quickStats.totalStorageCost > 2000 ? 'error.main' : 'warning.main'}>
                    {formatCurrency(quickStats.totalStorageCost)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
                    Costo de Almacenamiento
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Sección 1: Alertas Críticas y Estado General */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:alert-triangle-outline" />
            Alertas y Estado Actual
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <StorageExpirationAlerts />
            </Grid>
            <Grid item xs={12} lg={4}>
              <RepairStatusOverview compact />
            </Grid>
          </Grid>
        </Box>

        {/* Sección 2: Análisis y Métricas */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:bar-chart-outline" />
            Análisis y Métricas
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <WarrantyClaimsMetrics dateRange={filters.dateRange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <StorageCostCalculator />
            </Grid>
          </Grid>
        </Box>

        {/* Sección 3: Reportes y Documentación */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:file-text-outline" />
            Reportes y Documentación
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <WarrantyReports />
            </Grid>
          </Grid>
        </Box>

        {/* Botón de Acciones Rápidas */}
        <Zoom in={quickStats.urgentActions > 0}>
          <Fab
            color="error"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000
            }}
            onClick={() => setQuickActionsOpen(true)}
          >
            <Icon icon="eva:phone-outline" width={24} />
          </Fab>
        </Zoom>

        {/* Dialog de Filtros */}
        <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:funnel-outline" width={24} />
              Filtros del Dashboard
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Rango de Fechas */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Rango de Fechas
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <DatePicker
                      label="Desde"
                      value={filters.dateRange?.from || null}
                      onChange={(date) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          from: date || new Date()
                        }
                      }))}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DatePicker
                      label="Hasta"
                      value={filters.dateRange?.to || null}
                      onChange={(date) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          to: date || new Date()
                        }
                      }))}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Tipo de Dispositivo */}
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Dispositivo</InputLabel>
                <Select
                  value={filters.deviceType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, deviceType: e.target.value }))}
                  label="Tipo de Dispositivo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="Lavadora">Lavadora</MenuItem>
                  <MenuItem value="Refrigerador">Refrigerador</MenuItem>
                  <MenuItem value="Microondas">Microondas</MenuItem>
                  <MenuItem value="Estufa">Estufa</MenuItem>
                </Select>
              </FormControl>

              {/* Opciones */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Opciones de Vista
                </Typography>
                <Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.urgentOnly || false}
                        onChange={(e) => setFilters(prev => ({ ...prev, urgentOnly: e.target.checked }))}
                      />
                    }
                    label="Solo elementos urgentes"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.showCosts !== false}
                        onChange={(e) => setFilters(prev => ({ ...prev, showCosts: e.target.checked }))}
                      />
                    }
                    label="Mostrar información de costos"
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFiltersOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outlined"
              onClick={() => setFilters({ urgentOnly: false, showCosts: true })}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                // Aplicar filtros
                setFiltersOpen(false);
              }}
            >
              Aplicar Filtros
            </Button>
          </DialogActions>
        </Dialog>

        {/* Paneles Avanzados */}
        <ConfigurationPanel 
          open={configPanelOpen} 
          onClose={() => setConfigPanelOpen(false)}
          onConfigUpdated={handleRefreshAll}
        />

        <AdvancedFilters
          open={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          currentFilters={filters}
          onFiltersApplied={(newFilters) => {
            setFilters(newFilters);
            setAdvancedFiltersOpen(false);
            handleRefreshAll();
          }}
        />

        <QuickActionsPanel
          open={quickActionsOpen}
          onClose={() => setQuickActionsOpen(false)}
          onActionCompleted={(action, orderId) => {
            console.log(`Acción completada: ${action}`, orderId);
            handleRefreshAll();
          }}
        />

        <ReportExportDialog
          open={reportExportOpen}
          onClose={() => setReportExportOpen(false)}
        />

        <AlertConfigurationPanel
          open={alertConfigOpen}
          onClose={() => setAlertConfigOpen(false)}
          onRulesUpdated={handleRefreshAll}
        />

        {/* Diálogo del reporte de garantías */}
        <Dialog
          open={warrantyReportOpen}
          onClose={() => setWarrantyReportOpen(false)}
          maxWidth="xl"
          fullWidth
          scroll="paper"
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Reporte Completo de Garantías</Typography>
              <IconButton onClick={() => setWarrantyReportOpen(false)}>
                <Icon icon="eva:close-outline" />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <WarrantyReportViewer />
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}