"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Container, Box, Typography, Stack } from '@mui/material';

export default function TestNavigationPage() {
  const router = useRouter();

  const routes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Reparaciones', path: '/repairs' },
    { name: 'Clientes', path: '/clients' },
    { name: 'Inventario', path: '/inventory' },
    { name: 'Ventas', path: '/sales' },
    { name: 'Reportes', path: '/reports' },
    { name: 'Sistema', path: '/system' }
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Prueba de Navegación
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Prueba cada enlace para verificar que las rutas funcionen:
        </Typography>

        <Stack spacing={2}>
          {routes.map((route) => (
            <Button
              key={route.path}
              variant="outlined"
              onClick={() => router.push(route.path)}
              sx={{ justifyContent: 'flex-start' }}
            >
              Ir a {route.name} ({route.path})
            </Button>
          ))}
        </Stack>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Typography variant="body2">
            Si algún botón no funciona, hay un problema con esa ruta específica.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}