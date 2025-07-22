"use client";

import React, { useState } from 'react';
import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Product } from '@/types/product';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CustomButton from '@/components/ui/CustomButton';

// Mock del servicio mientras no esté conectado a la BD
const mockInventoryService = {
  getProducts: async (): Promise<Product[]> => {
    return [
      { _id: '1', name: 'Lavadora Carga Frontal', brand: 'LG', model: 'W-101', price: 8500, stock: 10, lowStockThreshold: 3, images: [], createdAt: new Date(), updatedAt: new Date(), description: '' },
      { _id: '2', name: 'Refrigerador No-Frost', brand: 'Samsung', model: 'RF-202', price: 12000, stock: 5, lowStockThreshold: 2, images: [], createdAt: new Date(), updatedAt: new Date(), description: '' },
      { _id: '3', name: 'Microondas', brand: 'Panasonic', model: 'MW-303', price: 2500, stock: 1, lowStockThreshold: 5, images: [], createdAt: new Date(), updatedAt: new Date(), description: '' },
    ];
  }
};

const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nombre', width: 250 },
    { field: 'brand', headerName: 'Marca', width: 150 },
    { field: 'model', headerName: 'Modelo', width: 150 },
    { field: 'price', headerName: 'Precio', type: 'number', width: 120 },
    { field: 'stock', headerName: 'Stock', type: 'number', width: 100 },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    mockInventoryService.getProducts().then(data => {
      setProducts(data);
      setIsLoading(false);
    });
  }, []);

  const totalValue = products.reduce((acc, product) => acc + product.price * product.stock, 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <StatCard title="Total Products" value={String(products.length)} icon={<InventoryIcon />} />
            </Grid>
            <Grid item xs={12} md={6}>
                <StatCard title="Total Value" value={`$${totalValue.toLocaleString()}`} icon={<MonetizationOnIcon />} />
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
    <DataTable rows={products} columns={columns} getRowId={(row) => row._id} />
                </Paper>
            </Grid>
        </Grid>
    </Container>
  );
}
