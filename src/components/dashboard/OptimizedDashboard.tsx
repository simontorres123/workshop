import React, { Suspense } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Componentes asincrónicos
import AsyncDashboardStats from './AsyncDashboardStats';
import AsyncStorageList from './AsyncStorageList';
import AsyncWarrantyMetrics from './AsyncWarrantyMetrics';

// Skeleton loaders como fallback
import { StatsGridSkeleton, ListSkeleton, ChartSkeleton } from '@/components/ui/SkeletonLoader';

const OptimizedDashboard: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header que se muestra inmediatamente */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard de Garantías y Almacén
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitoreo en tiempo real de reparaciones, garantías y almacenamiento
        </Typography>
      </Box>

      {/* Stats Grid - Se carga de forma independiente */}
      <Box sx={{ mb: 4 }}>
        <ErrorBoundary fallback="Error cargando estadísticas">
          <Suspense fallback={<StatsGridSkeleton cols={4} />}>
            <AsyncDashboardStats />
          </Suspense>
        </ErrorBoundary>
      </Box>

      {/* Grid principal con dos columnas */}
      <Grid container spacing={3}>
        {/* Columna izquierda - Lista de almacén */}
        <Grid item xs={12} md={6}>
          <ErrorBoundary fallback="Error cargando almacén">
            <Suspense fallback={<ListSkeleton />}>
              <AsyncStorageList />
            </Suspense>
          </ErrorBoundary>
        </Grid>

        {/* Columna derecha - Métricas de garantía */}
        <Grid item xs={12} md={6}>
          <ErrorBoundary fallback="Error cargando métricas">
            <Suspense fallback={<ChartSkeleton />}>
              <AsyncWarrantyMetrics />
            </Suspense>
          </ErrorBoundary>
        </Grid>
      </Grid>

      {/* Sección adicional que se puede expandir */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Acciones Rápidas
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Las acciones rápidas se cargarán aquí...
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default OptimizedDashboard;