"use client";

import React, { useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CustomButton from '@/components/ui/CustomButton';
import { useProducts } from '@/hooks/useProducts';

const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nombre', flex: 2, minWidth: 250 },
    { field: 'brand', headerName: 'Marca', flex: 1, minWidth: 150 },
    { field: 'model', headerName: 'Modelo', flex: 1, width: 150 },
    { 
      field: 'price', 
      headerName: 'Precio', 
      type: 'number', 
      flex: 1, 
      minWidth: 120,
      valueFormatter: (value) => `$${Number(value).toLocaleString()}`
    },
    { field: 'stock', headerName: 'Stock', type: 'number', flex: 1, minWidth: 100 },
];

export default function InventoryPage() {
  const { products, loading, error, fetchProducts } = useProducts();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalValue = (products || []).reduce((acc, product) => acc + (product.price || 0) * (product.stock || 0), 0);

  if (loading && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <StatCard 
                  title="Productos Totales" 
                  value={String(products.length)} 
                  icon={<InventoryIcon />} 
                  color="info"
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <StatCard 
                  title="Valor Total" 
                  value={`$${totalValue.toLocaleString()}`} 
                  icon={<MonetizationOnIcon />} 
                  color="success"
                />
            </Grid>
            <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                    Inventario de Productos
                    </Typography>
                    <CustomButton variant="contained">
                    Añadir Producto
                    </CustomButton>
                </Box>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                  <DataTable rows={products} columns={columns} getRowId={(row) => row.id} />
                </Paper>
            </Grid>
        </Grid>
    </Container>
  );
}
