"use client";

import React, { useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query'; // Usaremos react-query para el fetching
import { inventoryService } from '@/services/inventory.service';
import { Product } from '@/types/product';

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
  {
    field: 'status',
    headerName: 'Estado',
    width: 130,
    renderCell: (params) => {
      const { stock, lowStockThreshold } = params.row;
      const isLowStock = stock <= lowStockThreshold;
      return (
        <Box sx={{ color: isLowStock ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
          {isLowStock ? 'Bajo Stock' : 'En Stock'}
        </Box>
      );
    },
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 150,
    renderCell: (params) => (
      <Button variant="outlined" size="small">
        Editar
      </Button>
    ),
  },
];

export default function InventoryPage() {
  // const { data: products, isLoading } = useQuery({
  //   queryKey: ['products'],
  //   queryFn: () => inventoryService.getProducts(),
  // });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    mockInventoryService.getProducts().then(data => {
      setProducts(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Inventario de Productos
        </Typography>
        <Button variant="contained">
          Añadir Producto
        </Button>
      </Box>
      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={products || []}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
        />
      </div>
    </Container>
  );
}
