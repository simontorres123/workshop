"use client";

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { Icon } from '@iconify/react';

export default function SalesPage() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Módulo de Ventas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestión de ventas y facturación
          </Typography>
        </Box>

        {/* Coming Soon */}
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Icon icon="eva:credit-card-outline" width={80} height={80} color="primary" />
            <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
              Sistema de Ventas
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Próximamente podrás gestionar todas las ventas y facturación desde aquí.
            </Typography>
            
            <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>
              <Typography variant="body2">
                <strong>Características planeadas:</strong> Punto de venta, facturas, control de inventario, reportes de ventas.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}