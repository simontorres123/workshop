import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import { Icon } from '@iconify/react';
import WarrantyReportViewer from './WarrantyReportViewer';

export default function WarrantyReports() {
  const [fullReportOpen, setFullReportOpen] = useState(false);

  return (
    <Card>
      <CardHeader 
        title="Reportes de Garantías"
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="eva:file-text-outline" />}
            onClick={() => setFullReportOpen(true)}
            size="small"
          >
            Ver Completo
          </Button>
        }
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Genera reportes completos de garantías con análisis detallado, estadísticas y recomendaciones.
        </Typography>
        
        <Box mt={2}>
          <Typography variant="h6" gutterBottom>
            Características del Reporte:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <li>Resumen ejecutivo de garantías</li>
            <li>Análisis de garantías expiradas y próximas a expirar</li>
            <li>Estadísticas por tipo de dispositivo y cliente</li>
            <li>Reclamos de garantía activos</li>
            <li>Recomendaciones automáticas</li>
            <li>Exportación en múltiples formatos</li>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<Icon icon="eva:bar-chart-outline" />}
            onClick={() => setFullReportOpen(true)}
          >
            Ver Reporte Completo
          </Button>
        </Box>
      </CardContent>

      {/* Diálogo del reporte completo */}
      <Dialog
        open={fullReportOpen}
        onClose={() => setFullReportOpen(false)}
        maxWidth="xl"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Reporte Completo de Garantías</Typography>
            <IconButton onClick={() => setFullReportOpen(false)}>
              <Icon icon="eva:close-outline" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <WarrantyReportViewer />
        </DialogContent>
      </Dialog>
    </Card>
  );
}