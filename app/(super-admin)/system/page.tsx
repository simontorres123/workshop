"use client";

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Icon } from '@iconify/react';
import PushNotificationSettings from '@/components/ui/PushNotificationSettings';

interface SystemStatus {
  database: {
    connected: boolean;
    name: string;
    endpoint: string;
    provider: string;
  };
  tables: {
    total: number;
    active: number;
    rlsEnabled: number;
    list: Array<{
      name: string;
      active: boolean;
      rls: boolean;
    }>;
  };
  migrations: {
    count: number;
    status: string;
  };
  features: {
    rls: string;
    realtime: string;
    functions: string;
    relational: string;
  };
}

export default function SystemPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const result = await response.json();
      
      if (result.success) {
        setSystemStatus(result.data);
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error fetching system status' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Configuración del Sistema
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitoreo de Base de Datos PostgreSQL • Seguridad RLS • Migraciones de Esquema • Notificaciones Push
          </Typography>
        </Box>

        {/* Message Alert */}
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {systemStatus && (
          <>
            {/* Connection Status */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon 
                      icon={systemStatus.database.connected ? "eva:checkmark-circle-2-fill" : "eva:close-circle-fill"} 
                      width={48} 
                      color={systemStatus.database.connected ? "green" : "red"}
                    />
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {systemStatus.database.connected ? 'Conectado' : 'Desconectado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {systemStatus.database.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:layers-fill" width={48} color="primary" />
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {systemStatus.tables?.active ?? 0}/{systemStatus.tables?.total ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tablas Operativas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:shield-fill" width={48} color="success" />
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {systemStatus.tables?.rlsEnabled ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tablas con RLS Activo
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:activity-fill" width={48} color="info" />
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      {systemStatus.migrations?.count ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Migraciones SQL Aplicadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Features List */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Arquitectura de Datos (Supabase Native)" 
                avatar={<Icon icon="eva:flash-fill" width={24} />}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Icon icon="eva:checkmark-circle-2-fill" color="green" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Row Level Security (RLS)"
                          secondary="Políticas de acceso basadas en el rol y organización del usuario"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Icon icon="eva:checkmark-circle-2-fill" color="green" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Esquema Relacional Nativo"
                          secondary="Integridad referencial y tipos de datos estrictos en PostgreSQL"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Icon icon="eva:checkmark-circle-2-fill" color="green" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Realtime Subscriptions"
                          secondary="Actualizaciones en vivo para notificaciones y estado de reparaciones"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Icon icon="eva:checkmark-circle-2-fill" color="green" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Edge Functions"
                          secondary="Lógica de servidor distribuida para integraciones externas"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Tables Information Table */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Estado de las Tablas"
                subheader="Listado de entidades registradas en el esquema público"
              />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre de la Tabla</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Seguridad (RLS)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(systemStatus.tables?.list || []).map((table) => (
                        <TableRow key={table.name}>
                          <TableCell sx={{ fontWeight: 'medium' }}>{table.name}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={table.active ? "Operativa" : "No disponible"} 
                              color={table.active ? "success" : "error"} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={table.rls ? "Protegida" : "Pública"} 
                              color={table.rls ? "primary" : "warning"} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Configuración de Notificaciones Push */}
            <Box sx={{ mt: 4 }}>
              <PushNotificationSettings />
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
