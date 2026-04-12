import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Alert,
  AlertTitle,
  Stack,
  Chip,
  Paper,
  LinearProgress
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Icon } from '@iconify/react';
import { reportExporter, ExportOptions, ReportData } from '@/utils/report-exporter';
import { useRepairedOrders } from '@/hooks/useRepairedOrders';
import { calculateStorageAlerts } from '@/utils/storageAlerts';
import { calculateExpirationAlerts } from '@/utils/warrantyAlerts';
// Import removed - we'll use API calls instead
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ReportExportDialog({ open, onClose }: ReportExportDialogProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    template: 'detailed',
    includeImages: false,
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
      to: new Date()
    },
    filters: {
      urgentOnly: false
    }
  });

  const [customFilename, setCustomFilename] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleOptionChange = (field: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedOptionChange = (parent: string, field: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof ExportOptions],
        [field]: value
      }
    }));
  };

  const generatePreview = async () => {
    try {
      setPreviewLoading(true);
      
      // Obtener datos para el reporte usando API
      const response = await fetch('/api/repairs?' + new URLSearchParams({
        ...(exportOptions.dateRange?.from && { startDate: exportOptions.dateRange.from.toISOString() }),
        ...(exportOptions.dateRange?.to && { endDate: exportOptions.dateRange.to.toISOString() }),
        limit: '1000' // Obtener un límite alto para reportes
      }));
      
      if (!response.ok) {
        throw new Error('Error obteniendo datos de órdenes');
      }
      
      const { data: orders } = await response.json();

      const storageAlerts = calculateStorageAlerts(
        orders.filter(order => order.status === 'repaired' && !order.deliveredAt)
      );

      const warrantyAlerts = calculateExpirationAlerts(orders);

      const reportData: ReportData = {
        title: `Reporte de Garantías y Almacenamiento - ${format(new Date(), 'MMMM yyyy', { locale: es })}`,
        generatedAt: new Date(),
        generatedBy: 'Usuario Actual', // En producción, obtener del contexto de auth
        orders: exportOptions.filters?.urgentOnly 
          ? orders.filter(order => {
              const hasAlert = [...storageAlerts.storageAlerts, ...warrantyAlerts.warrantyAlerts]
                .some(alert => alert.id === order.id);
              return hasAlert;
            })
          : orders,
        storageAlerts: storageAlerts.storageAlerts,
        warrantyAlerts: warrantyAlerts.warrantyAlerts,
        summary: {
          totalOrders: orders.length,
          totalCost: orders.reduce((sum, order) => sum + (order.totalCost || 0), 0),
          averageDays: storageAlerts.averageDaysInStorage,
          criticalAlerts: storageAlerts.criticalAlertsCount + warrantyAlerts.criticalAlerts
        }
      };

      setPreviewData(reportData);

    } catch (error) {
      console.error('Error generando preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!previewData) {
      await generatePreview();
      return;
    }

    try {
      setExporting(true);

      const filename = customFilename || 
        `reporte-garantias-${format(new Date(), 'yyyy-MM-dd-HHmm')}`;

      let content: string | Blob;
      let mimeType: string;
      let extension: string;

      switch (exportOptions.format) {
        case 'csv':
          content = reportExporter.exportToCSV(previewData, exportOptions);
          mimeType = 'text/csv';
          extension = 'csv';
          break;

        case 'json':
          content = reportExporter.exportToJSON(previewData, exportOptions);
          mimeType = 'application/json';
          extension = 'json';
          break;

        case 'pdf':
          content = await reportExporter.exportToPDF(previewData, exportOptions);
          mimeType = 'application/pdf';
          extension = 'pdf';
          break;

        case 'excel':
          // Para Excel, usamos CSV por simplicidad
          content = reportExporter.exportToCSV(previewData, exportOptions);
          mimeType = 'application/vnd.ms-excel';
          extension = 'xls';
          break;

        default:
          throw new Error('Formato no soportado');
      }

      reportExporter.downloadFile(content, `${filename}.${extension}`, mimeType);

      // Cerrar dialog después de un momento
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error exportando reporte:', error);
    } finally {
      setExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    const icons = {
      csv: 'eva:file-text-outline',
      excel: 'eva:file-outline',
      pdf: 'eva:file-outline',
      json: 'eva:code-outline'
    };
    return icons[format as keyof typeof icons] || 'eva:file-outline';
  };

  const getFormatColor = (format: string) => {
    const colors = {
      csv: 'success',
      excel: 'info',
      pdf: 'error',
      json: 'warning'
    };
    return colors[format as keyof typeof colors] || 'default';
  };

  const estimateFileSize = (data: ReportData | null, format: string): string => {
    if (!data) return 'N/A';
    
    const orderCount = data.orders.length;
    const alertCount = data.storageAlerts.length + data.warrantyAlerts.length;
    
    // Estimaciones aproximadas en KB
    const estimates = {
      csv: Math.ceil((orderCount * 0.2) + (alertCount * 0.1)),
      json: Math.ceil((orderCount * 0.5) + (alertCount * 0.3)),
      pdf: Math.ceil((orderCount * 0.8) + (alertCount * 0.5) + 50), // +50KB por formato
      excel: Math.ceil((orderCount * 0.3) + (alertCount * 0.2))
    };
    
    const sizeKB = estimates[format as keyof typeof estimates] || 0;
    
    if (sizeKB > 1024) {
      return `~${(sizeKB / 1024).toFixed(1)} MB`;
    }
    return `~${sizeKB} KB`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="eva:download-outline" width={24} />
          <Box>
            <Typography variant="h6">Exportar Reporte</Typography>
            <Typography variant="caption" color="text.secondary">
              Generar y descargar reportes personalizados
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Opciones de Formato */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Formato de Exportación
            </Typography>
            <Grid container spacing={1}>
              {['csv', 'excel', 'pdf', 'json'].map((format) => (
                <Grid item xs={6} key={format}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      border: exportOptions.format === format ? 2 : 1,
                      borderColor: exportOptions.format === format 
                        ? `${getFormatColor(format)}.main` 
                        : 'divider',
                      bgcolor: exportOptions.format === format 
                        ? `${getFormatColor(format)}.lighter` 
                        : 'background.paper'
                    }}
                    onClick={() => handleOptionChange('format', format)}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Icon 
                        icon={getFormatIcon(format)} 
                        width={32} 
                        color={exportOptions.format === format 
                          ? `${getFormatColor(format)}.main` 
                          : 'text.secondary'
                        }
                      />
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        {format.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {estimateFileSize(previewData, format)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Opciones de Contenido */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Plantilla de Reporte
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Tipo de reporte</InputLabel>
              <Select
                value={exportOptions.template}
                onChange={(e) => handleOptionChange('template', e.target.value)}
                label="Tipo de reporte"
              >
                <MenuItem value="detailed">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:list-outline" width={16} />
                    Detallado
                  </Box>
                </MenuItem>
                <MenuItem value="summary">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:bar-chart-outline" width={16} />
                    Resumen
                  </Box>
                </MenuItem>
                <MenuItem value="executive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:briefcase-outline" width={16} />
                    Ejecutivo
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.includeImages || false}
                    onChange={(e) => handleOptionChange('includeImages', e.target.checked)}
                  />
                }
                label="Incluir imágenes (solo PDF)"
                disabled={exportOptions.format !== 'pdf'}
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.filters?.urgentOnly || false}
                    onChange={(e) => handleNestedOptionChange('filters', 'urgentOnly', e.target.checked)}
                  />
                }
                label="Solo elementos urgentes"
              />
            </Stack>
          </Grid>

          {/* Rango de Fechas */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Rango de Fechas
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Fecha desde"
                  value={exportOptions.dateRange?.from || null}
                  onChange={(date) => handleNestedOptionChange('dateRange', 'from', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Fecha hasta"
                  value={exportOptions.dateRange?.to || null}
                  onChange={(date) => handleNestedOptionChange('dateRange', 'to', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Nombre de Archivo */}
          <Grid item xs={12}>
            <TextField
              label="Nombre del archivo (opcional)"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={`reporte-garantias-${format(new Date(), 'yyyy-MM-dd')}`}
              helperText="Si se deja vacío, se generará automáticamente"
              fullWidth
              size="small"
            />
          </Grid>

          {/* Preview de Datos */}
          {previewData && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vista Previa del Reporte
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {previewData.summary.totalOrders}
                      </Typography>
                      <Typography variant="caption">Total Órdenes</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="error">
                        {previewData.summary.criticalAlerts}
                      </Typography>
                      <Typography variant="caption">Alertas Críticas</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="success.main">
                        ${previewData.summary.totalCost.toLocaleString()}
                      </Typography>
                      <Typography variant="caption">Costo Total</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="info.main">
                        {previewData.summary.averageDays}
                      </Typography>
                      <Typography variant="caption">Días Promedio</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Información del Formato */}
          <Grid item xs={12}>
            <Alert severity="info">
              <AlertTitle>Información del Formato {exportOptions.format.toUpperCase()}</AlertTitle>
              {exportOptions.format === 'csv' && 'Ideal para análisis en Excel. Compatible con hojas de cálculo.'}
              {exportOptions.format === 'excel' && 'Formato nativo de Excel con múltiples hojas.'}
              {exportOptions.format === 'pdf' && 'Documento con formato profesional, ideal para presentaciones.'}
              {exportOptions.format === 'json' && 'Datos estructurados para integración con otros sistemas.'}
            </Alert>
          </Grid>
        </Grid>

        {previewLoading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Generando vista previa...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {previewData ? `${previewData.summary.totalOrders} órdenes seleccionadas` : 'Vista previa no generada'}
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={exporting}>
              Cancelar
            </Button>
            
            <Button
              variant="outlined"
              onClick={generatePreview}
              disabled={previewLoading || exporting}
              startIcon={<Icon icon="eva:eye-outline" />}
            >
              Vista Previa
            </Button>
            
            <LoadingButton
              variant="contained"
              onClick={handleExport}
              loading={exporting}
              disabled={!previewData}
              startIcon={<Icon icon="eva:download-outline" />}
            >
              {exporting ? 'Exportando...' : 'Exportar'}
            </LoadingButton>
          </Stack>
        </Box>
      </DialogActions>
    </Dialog>
  );
}