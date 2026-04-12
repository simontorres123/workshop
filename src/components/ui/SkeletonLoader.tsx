import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table' | 'chart' | 'stat' | 'list';
  rows?: number;
  height?: number;
  animation?: 'pulse' | 'wave' | false;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  rows = 3,
  height = 200,
  animation = 'wave'
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'stat':
        return (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={48} height={48} animation={animation} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} animation={animation} />
                  <Skeleton variant="text" width="40%" height={32} animation={animation} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        );

      case 'chart':
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={24} animation={animation} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={height} animation={animation} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Skeleton variant="text" width="20%" height={16} animation={animation} />
                <Skeleton variant="text" width="20%" height={16} animation={animation} />
                <Skeleton variant="text" width="20%" height={16} animation={animation} />
              </Box>
            </CardContent>
          </Card>
        );

      case 'table':
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="25%" height={28} animation={animation} sx={{ mb: 2 }} />
              {/* Header */}
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Skeleton variant="text" width="20%" height={20} animation={animation} />
                <Skeleton variant="text" width="25%" height={20} animation={animation} />
                <Skeleton variant="text" width="15%" height={20} animation={animation} />
                <Skeleton variant="text" width="20%" height={20} animation={animation} />
                <Skeleton variant="text" width="20%" height={20} animation={animation} />
              </Box>
              {/* Rows */}
              {Array.from({ length: rows }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Skeleton variant="text" width="20%" height={16} animation={animation} />
                  <Skeleton variant="text" width="25%" height={16} animation={animation} />
                  <Skeleton variant="text" width="15%" height={16} animation={animation} />
                  <Skeleton variant="text" width="20%" height={16} animation={animation} />
                  <Skeleton variant="text" width="20%" height={16} animation={animation} />
                </Box>
              ))}
            </CardContent>
          </Card>
        );

      case 'list':
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="30%" height={24} animation={animation} sx={{ mb: 2 }} />
              {Array.from({ length: rows }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Skeleton variant="circular" width={32} height={32} animation={animation} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={16} animation={animation} />
                    <Skeleton variant="text" width="50%" height={14} animation={animation} />
                  </Box>
                  <Skeleton variant="text" width="15%" height={16} animation={animation} />
                </Box>
              ))}
            </CardContent>
          </Card>
        );

      default: // card
        return (
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" height={24} animation={animation} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" height={16} animation={animation} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={height} animation={animation} />
            </CardContent>
          </Card>
        );
    }
  };

  return renderSkeleton();
};

// Skeleton específicos para el dashboard
export const StatCardSkeleton = () => <SkeletonLoader variant="stat" />;
export const ChartSkeleton = () => <SkeletonLoader variant="chart" height={300} />;
export const TableSkeleton = () => <SkeletonLoader variant="table" rows={5} />;
export const ListSkeleton = () => <SkeletonLoader variant="list" rows={4} />;

// Grid de skeletons para stats
export const StatsGridSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <Grid container spacing={3}>
    {Array.from({ length: cols }).map((_, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <StatCardSkeleton />
      </Grid>
    ))}
  </Grid>
);

export default SkeletonLoader;