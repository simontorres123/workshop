import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import { StatCardSkeleton } from '@/components/ui/SkeletonLoader';
import StatCard from '@/components/ui/StatCard';
import { Icon } from '@iconify/react';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inRepairOrders: number;
  completedOrders: number;
}

const AsyncDashboardStats: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simular delay mínimo para mostrar skeleton
        const [response] = await Promise.all([
          fetch('/api/repair-orders?includeAll=true'),
          new Promise(resolve => setTimeout(resolve, 500)) // Mínimo 500ms para smooth UX
        ]);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const orders = data.data;
          const calculatedStats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter((o: any) => 
              ['pending_diagnosis', 'diagnosis_confirmed'].includes(o.status?.toLowerCase())
            ).length,
            inRepairOrders: orders.filter((o: any) => 
              o.status?.toLowerCase() === 'in_repair'
            ).length,
            completedOrders: orders.filter((o: any) => 
              ['repaired', 'completed'].includes(o.status?.toLowerCase())
            ).length,
          };
          
          setStats(calculatedStats);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={`skeleton-${index}`}>
            <StatCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error || !stats) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={`error-${index}`}>
            <StatCard
              title="Error de carga"
              value="--"
              icon={<Icon icon="eva:alert-triangle-outline" width={24} />}
              color="error"
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total de Órdenes"
          value={stats.totalOrders.toString()}
          icon={<Icon icon="eva:file-text-outline" width={24} />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Pendientes"
          value={stats.pendingOrders.toString()}
          icon={<Icon icon="eva:clock-outline" width={24} />}
          color="warning"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="En Reparación"
          value={stats.inRepairOrders.toString()}
          icon={<Icon icon="eva:settings-outline" width={24} />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Completadas"
          value={stats.completedOrders.toString()}
          icon={<Icon icon="eva:checkmark-circle-outline" width={24} />}
          color="success"
        />
      </Grid>
    </Grid>
  );
};

export default AsyncDashboardStats;