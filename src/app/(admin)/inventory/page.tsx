"use client";

import React, { useEffect } from 'react';
import { Box, Container, Paper, Typography, CircularProgress, Alert, Stack, useMediaQuery, useTheme } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CustomButton from '@/components/ui/CustomButton';
import { useProducts } from '@/hooks/useProducts';

export default function InventoryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { products, loading, error, fetchProducts } = useProducts();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalValue = (products || []).reduce((acc, product) => acc + (product.price || 0) * (product.stock || 0), 0);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nombre', flex: 2, minWidth: 150 },
    ...(!isMobile ? [
      { field: 'brand', headerName: 'Marca', flex: 1, minWidth: 120 } as GridColDef,
      { field: 'model', headerName: 'Modelo', flex: 1, minWidth: 120 } as GridColDef,
    ] : []),
    {
      field: 'price',
      headerName: 'Precio',
      type: 'number' as const,
      flex: 1,
      minWidth: 100,
      valueFormatter: (value: number) => `$${Number(value).toLocaleString()}`
    },
    { field: 'stock', headerName: 'Stock', type: 'number' as const, flex: 1, minWidth: 80 },
  ];

  if (loading && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="Productos Totales"
            value={String(products.length)}
            icon={<InventoryIcon />}
            color="info"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard
            title="Valor Total"
            value={`$${totalValue.toLocaleString()}`}
            icon={<MonetizationOnIcon />}
            color="success"
          />
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Inventario de Productos
        </Typography>
        <CustomButton variant="contained" sx={{ flexShrink: 0 }}>
          Añadir Producto
        </CustomButton>
      </Box>

      <Paper sx={{ p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column' }}>
        <DataTable rows={products} columns={columns} getRowId={(row) => row.id} />
      </Paper>
    </Container>
  );
}
