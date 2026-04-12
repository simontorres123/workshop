import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { ChartSkeleton } from '@/components/ui/SkeletonLoader';
import { Icon } from '@iconify/react';

interface WarrantyMetrics {
  totalClaims: number;
  pendingClaims: number;
  resolvedClaims: number;
  rejectedClaims: number;
  averageResolutionTime: number;
}

const AsyncWarrantyMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<WarrantyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [response] = await Promise.all([
          fetch('/api/warranty/metrics'),
          new Promise(resolve => setTimeout(resolve, 400)) // Delay mínimo
        ]);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setMetrics(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching warranty metrics:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <ChartSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Métricas de Garantía
          </Typography>
          <Alert severity="error">
            Error al cargar métricas: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Métricas de Garantía
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Icon icon="eva:bar-chart-outline" width={48} height={48} style={{ opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No hay datos de garantía disponibles
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Métricas de Garantía
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {metrics.totalClaims}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Reclamos
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {metrics.pendingClaims}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pendientes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {metrics.resolvedClaims}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Resueltos
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {metrics.rejectedClaims}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Rechazados
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:clock-outline" width={20} />
            <Typography variant="body2" color="text.secondary">
              Tiempo promedio de resolución
            </Typography>
          </Box>
          <Chip 
            label={`${metrics.averageResolutionTime} días`} 
            color="info" 
            size="small" 
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default AsyncWarrantyMetrics;