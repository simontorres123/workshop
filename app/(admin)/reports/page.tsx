"use client";

import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

export default function ReportsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reportes
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">
          Próximamente
        </Typography>
        <Typography>
          Esta sección contendrá reportes de ventas, reparaciones y más.
        </Typography>
      </Paper>
    </Container>
  );
}
