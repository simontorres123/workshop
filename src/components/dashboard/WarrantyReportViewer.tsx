'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WarrantyReport } from '@/utils/warranty-reports';

interface WarrantyReportViewerProps {
  className?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`warranty-tabpanel-${index}`}
      aria-labelledby={`warranty-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function WarrantyReportViewer({ className }: WarrantyReportViewerProps) {
  const [report, setReport] = useState<WarrantyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/reports/warranty');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo reporte de garantías');
      }
      
      setReport(result.data);
    } catch (error) {
      console.error('Error fetching warranty report:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleExportReport = async (format: 'csv' | 'text' | 'json') => {
    try {
      const response = await fetch(`/api/reports/warranty?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Error exportando reporte');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `reporte-garantias-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Generando reporte de garantías...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6">Error al cargar reporte</Typography>
            <Typography>{error}</Typography>
            <Button variant="outlined" onClick={fetchReport} sx={{ mt: 2 }}>
              Reintentar
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert severity="info">
            No hay datos de garantías disponibles
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        {/* Header del reporte */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {report.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Generado: {format(new Date(report.generatedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Período: {report.period.description}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            Exportar
          </Button>
        </Box>

        {/* Resumen ejecutivo */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary">
                  {report.summary.totalOrders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de órdenes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {report.summary.ordersWithWarranty}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Con garantía
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {report.summary.expiredWarranties}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Garantías expiradas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {report.summary.expiringSoon}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiran pronto
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alertas críticas */}
        {report.alerts.total > 0 && (
          <Alert 
            severity={report.alerts.critical.length > 0 ? "error" : "warning"} 
            sx={{ mb: 3 }}
            icon={report.alerts.critical.length > 0 ? <ErrorIcon /> : <WarningIcon />}
          >
            <Typography variant="h6">
              Alertas activas: {report.alerts.total}
            </Typography>
            <Typography>
              {report.alerts.critical.length} críticas, {report.alerts.warning.length} advertencias
            </Typography>
          </Alert>
        )}

        {/* Tabs para diferentes vistas */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Garantías Expiradas" icon={<ErrorIcon />} />
            <Tab label="Expiran Pronto" icon={<ScheduleIcon />} />
            <Tab label="Estadísticas" icon={<AssignmentIcon />} />
            <Tab label="Recomendaciones" icon={<CheckCircleIcon />} />
          </Tabs>
        </Box>

        {/* Panel 1: Garantías Expiradas */}
        <TabPanel value={currentTab} index={0}>
          {report.expiredOrders.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Folio</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Dispositivo</TableCell>
                    <TableCell>Entregado</TableCell>
                    <TableCell>Días Vencido</TableCell>
                    <TableCell>Reclamos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.expiredOrders.map((order) => (
                    <TableRow key={order.folio}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {order.folio}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.deviceType}</TableCell>
                      <TableCell>
                        {format(new Date(order.deliveredAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${order.daysExpired} días`}
                          color="error"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {order.hasActiveClaims ? (
                          <Chip label="Sí" color="warning" size="small" />
                        ) : (
                          <Chip label="No" color="default" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="success">
              <Typography variant="h6">¡Excelente!</Typography>
              <Typography>No hay garantías expiradas en este momento.</Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Panel 2: Expiran Pronto */}
        <TabPanel value={currentTab} index={1}>
          {report.expiringSoonOrders.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Folio</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Dispositivo</TableCell>
                    <TableCell>Entregado</TableCell>
                    <TableCell>Días Restantes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.expiringSoonOrders.map((order) => (
                    <TableRow key={order.folio}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {order.folio}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.deviceType}</TableCell>
                      <TableCell>
                        {format(new Date(order.deliveredAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${order.daysRemaining} días`}
                          color={order.daysRemaining <= 7 ? "error" : "warning"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              <Typography variant="h6">Sin urgencias</Typography>
              <Typography>No hay garantías que expiren en los próximos 30 días.</Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Panel 3: Estadísticas */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            {/* Por tipo de dispositivo */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Por Tipo de Dispositivo
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Dispositivo</TableCell>
                      <TableCell align="right">Órdenes</TableCell>
                      <TableCell align="right">Reclamos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.statistics.byDeviceType.map((stat) => (
                      <TableRow key={stat.deviceType}>
                        <TableCell>{stat.deviceType}</TableCell>
                        <TableCell align="right">{stat.count}</TableCell>
                        <TableCell align="right">{stat.claimsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Top clientes */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Top Clientes
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Órdenes</TableCell>
                      <TableCell align="right">Reclamos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.statistics.topClients.slice(0, 5).map((client) => (
                      <TableRow key={client.clientName}>
                        <TableCell>{client.clientName}</TableCell>
                        <TableCell align="right">{client.ordersCount}</TableCell>
                        <TableCell align="right">{client.claimsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {/* Métricas adicionales */}
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Métricas Generales
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Promedio período de garantía
                </Typography>
                <Typography variant="h6">
                  {report.summary.averageWarrantyPeriod} meses
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Total reclamos activos
                </Typography>
                <Typography variant="h6">
                  {report.summary.activeClaims}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Panel 4: Recomendaciones */}
        <TabPanel value={currentTab} index={3}>
          <List>
            {report.recommendations.map((recommendation, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      {index + 1}. {recommendation}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>
      </CardContent>

      {/* Dialog de exportación */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Exportar Reporte de Garantías</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecciona el formato de exportación:
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Button variant="outlined" onClick={() => handleExportReport('csv')}>
              CSV (Excel)
            </Button>
            <Button variant="outlined" onClick={() => handleExportReport('text')}>
              Texto plano
            </Button>
            <Button variant="outlined" onClick={() => handleExportReport('json')}>
              JSON
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}