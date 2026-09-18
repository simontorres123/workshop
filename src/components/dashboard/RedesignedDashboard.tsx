"use client";

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { Icon } from '@iconify/react';
import { useRepairedOrders, useStorageStats } from '@/hooks/useRepairedOrders';
import { useAuthStore } from '@/store/auth.store';
import StorageExpirationAlerts from './StorageExpirationAlerts';
import StorageCostCalculator from './StorageCostCalculator';
import RepairStatusOverview from './RepairStatusOverview';
import WarrantyClaimsMetrics from './WarrantyClaimsMetrics';
import WarrantyReportViewer from './WarrantyReportViewer';
import ReportExportDialog from './ReportExportDialog';
import NotificationCenter from './NotificationCenter';
import ConfigurationPanel from './ConfigurationPanel';
import AdvancedFilters from './AdvancedFilters';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { esES } from '@mui/x-date-pickers/locales';

interface DashboardFilters {
  dateRange?: { from: Date; to: Date };
  deviceType?: string;
  urgentOnly?: boolean;
  showCosts?: boolean;
}

interface WarrantyMetricsSummary {
  totalClaims: number;
  claimRate: number;
}

const surfaceSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: '0 4px 18px rgba(33, 43, 54, 0.05)',
  height: '100%',
};

export default function RedesignedDashboard() {
  const { activeBranchId } = useAuthStore();
  const { repairedOrders, refreshData } = useRepairedOrders();
  const { stats, loading: storageLoading } = useStorageStats();
  const [warrantyMetrics, setWarrantyMetrics] = useState<WarrantyMetricsSummary>({ totalClaims: 0, claimRate: 0 });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ showCosts: true, urgentOnly: false });

  const period = useMemo(() => ({
    from: new Date(selectedYear, selectedMonth, 1),
    to: new Date(selectedYear, selectedMonth + 1, 1),
  }), [selectedMonth, selectedYear]);

  useEffect(() => {
    const params = new URLSearchParams({ dateFrom: period.from.toISOString(), dateTo: period.to.toISOString() });
    if (activeBranchId) params.set('branchId', activeBranchId);

    fetch(`/api/warranty/metrics?${params.toString()}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success && result.data) {
          setWarrantyMetrics({
            totalClaims: result.data.totalClaims || 0,
            claimRate: result.data.claimRate || 0,
          });
        }
      })
      .catch(() => setWarrantyMetrics({ totalClaims: 0, claimRate: 0 }));
  }, [activeBranchId, period]);

  const urgentCount = useMemo(() => {
    if (!stats) return 0;
    return stats.criticalAlerts || 0;
  }, [stats]);

  const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(selectedYear, selectedMonth, 1));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={es}
      localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}
    >
    <Box sx={{ px: { xs: 0, sm: 1 }, py: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Resumen operativo
          </Typography>
          <Typography color="text.secondary">Reparaciones, almacén y garantías · {monthLabel} {selectedYear}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <select
            aria-label="Año del dashboard"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            style={{ minHeight: 40, border: '1px solid #DFE3E8', borderRadius: 8, padding: '0 10px', color: '#212B36', background: '#fff' }}
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select
            aria-label="Mes del dashboard"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            style={{ minHeight: 40, border: '1px solid #DFE3E8', borderRadius: 8, padding: '0 10px', color: '#212B36', background: '#fff' }}
          >
            {Array.from({ length: 12 }, (_, month) => <option key={month} value={month}>{new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2024, month, 1))}</option>)}
          </select>
          <Tooltip title="Actualizar datos"><IconButton onClick={handleRefresh} disabled={refreshing} color="primary"><Icon icon="eva:refresh-outline" /></IconButton></Tooltip>
          <Button variant="outlined" onClick={() => setFiltersOpen(true)} startIcon={<Icon icon="eva:funnel-outline" />}>Filtros</Button>
          <Button variant="contained" onClick={(event) => setMenuAnchor(event.currentTarget)} endIcon={<Icon icon="eva:more-vertical-outline" />}>Acciones</Button>
        </Stack>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); setNotificationsOpen(true); }}><Icon icon="eva:bell-outline" width={20} /><Box component="span" sx={{ ml: 1 }}>Notificaciones</Box></MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setExportOpen(true); }}><Icon icon="eva:download-outline" width={20} /><Box component="span" sx={{ ml: 1 }}>Exportar</Box></MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setReportOpen(true); }}><Icon icon="eva:file-text-outline" width={20} /><Box component="span" sx={{ ml: 1 }}>Ver reporte completo</Box></MenuItem>
        <Divider />
        <MenuItem onClick={() => { setMenuAnchor(null); setConfigurationOpen(true); }}><Icon icon="eva:settings-outline" width={20} /><Box component="span" sx={{ ml: 1 }}>Configuración</Box></MenuItem>
      </Menu>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Esperando entrega', value: stats?.totalRepairedWaiting ?? repairedOrders.length, icon: 'eva:archive-outline', color: 'primary.main', context: 'Órdenes reparadas' },
          { label: 'Alertas críticas', value: urgentCount, icon: 'eva:alert-triangle-outline', color: urgentCount ? 'error.main' : 'success.main', context: urgentCount ? 'Requieren atención' : 'Sin pendientes críticos' },
          { label: 'Reclamos de garantía', value: warrantyMetrics.totalClaims, icon: 'eva:shield-outline', color: 'success.main', context: `${warrantyMetrics.claimRate.toFixed(1)}% del periodo` },
          { label: 'Costo de almacén', value: `$${(stats?.totalStorageCost ?? 0).toLocaleString('es-MX')}`, icon: 'eva:credit-card-outline', color: 'info.main', context: 'Costo acumulado' },
        ].map((item) => (
          <Card key={item.label} sx={surfaceSx}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.25 }, '&:last-child': { pb: { xs: 1.5, sm: 2.25 } } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography variant="body2" color="text.secondary">{item.label}</Typography><Icon icon={item.icon} width={24} style={{ color: `var(--mui-palette-${item.color.replace('.', '-')})` }} /></Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: item.color }}>{storageLoading ? '—' : item.value}</Typography>
              <Typography variant="caption" color="text.secondary">{item.context}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr .85fr' }, gap: 2, mb: 3 }}>
        <Card sx={surfaceSx}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}><Box><Typography variant="h6">Requiere atención</Typography><Typography variant="body2" color="text.secondary">Alertas de almacenamiento y entregas pendientes</Typography></Box><Chip color={urgentCount ? 'error' : 'success'} label={urgentCount ? `${urgentCount} críticas` : 'Todo en orden'} size="small" /></Box><StorageExpirationAlerts /></CardContent></Card>
        <Card sx={surfaceSx}><CardContent><Typography variant="h6" gutterBottom>Estado de reparaciones</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Distribución de órdenes del periodo</Typography><RepairStatusOverview compact showTitle={false} /></CardContent></Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card sx={surfaceSx}><CardContent><Typography variant="h6" gutterBottom>Almacén y costos</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Proyección y riesgo de las órdenes pendientes</Typography><StorageCostCalculator showTitle={false} /></CardContent></Card>
        <Card sx={surfaceSx}><CardContent><Typography variant="h6" gutterBottom>Garantías</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Reclamos y motivos principales</Typography><WarrantyClaimsMetrics showTitle={false} dateRange={period} /></CardContent></Card>
      </Box>

      <AdvancedFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={(nextFilters) => { setFilters(nextFilters as DashboardFilters); setFiltersOpen(false); }} />
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="lg" fullWidth><DialogTitle>Reporte completo</DialogTitle><DialogContent><WarrantyReportViewer /></DialogContent></Dialog>
      <ReportExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <ConfigurationPanel open={configurationOpen} onClose={() => setConfigurationOpen(false)} />
    </Box>
    </LocalizationProvider>
  );
}
