"use client";

import React, { Suspense } from 'react';
import AsyncWarrantyStorageDashboard from '@/components/dashboard/AsyncWarrantyStorageDashboard';
import { StatsGridSkeleton } from '@/components/ui/SkeletonLoader';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function DashboardPage() {
  return (
    <Suspense 
      fallback={
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Cargando Dashboard Completo...
            </Typography>
            <StatsGridSkeleton cols={4} />
          </Box>
        </Container>
      }
    >
      <AsyncWarrantyStorageDashboard />
    </Suspense>
  );
}