"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Alert,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Client, ClientWithHistory, ClientRepairHistory } from '@/types/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'repaired':
      return 'success';
    case 'in_repair':
    case 'diagnosis_confirmed':
      return 'warning';
    case 'pending_diagnosis':
      return 'info';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending_diagnosis':
      return 'Pendiente Diagnóstico';
    case 'diagnosis_confirmed':
      return 'Diagnóstico Confirmado';
    case 'in_repair':
      return 'En Reparación';
    case 'repaired':
      return 'Reparado';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

export default function ClientHistoryDialog({ 
  open, 
  onClose, 
  client 
}: ClientHistoryDialogProps) {
  const [clientData, setClientData] = useState<ClientWithHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && client) {
      fetchClientHistory();
    }
  }, [open, client]);

  const fetchClientHistory = async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${client.id}/history`);
      const result = await response.json();

      if (result.success) {
        setClientData(result.data);
      } else {
        setError(result.error || 'Error cargando historial');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching client history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClientData(null);
    setError(null);
    onClose();
  };

  if (!client) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Icon icon="eva:person-outline" width={24} />
          <Box>
            <Typography variant="h6">{client.fullName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Historial de Reparaciones
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box>
            {[...Array(3)].map((_, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Skeleton variant="text" height={40} />
                  <Skeleton variant="text" height={20} width="60%" />
                  <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : clientData ? (
          <>
            {/* Resumen del Cliente */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:layers-outline" width={40} height={40} color="primary.main" />
                    <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
                      {clientData.totalRepairs}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Reparaciones
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:credit-card-outline" width={40} height={40} color="success.main" />
                    <Typography variant="h4" color="success.main" sx={{ mt: 1 }}>
                      ${clientData.totalSpent.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Gastado
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Icon icon="eva:calendar-outline" width={40} height={40} color="info.main" />
                    <Typography variant="h6" color="info.main" sx={{ mt: 1 }}>
                      {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: es })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliente Desde
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Historial de Reparaciones */}
            <Typography variant="h6" gutterBottom>
              Historial de Reparaciones
            </Typography>

            {clientData.repairHistory.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Icon icon="eva:inbox-outline" width={64} height={64} color="text.secondary" />
                  <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                    Sin reparaciones registradas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Este cliente aún no tiene reparaciones en el historial
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Folio</TableCell>
                      <TableCell>Dispositivo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Costo</TableCell>
                      <TableCell>Fecha Ingreso</TableCell>
                      <TableCell>Fecha Completado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientData.repairHistory.map((repair) => (
                      <TableRow key={repair.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {repair.folio}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {repair.deviceType} {repair.deviceBrand}
                            </Typography>
                            {repair.deviceModel && (
                              <Typography variant="caption" color="text.secondary">
                                {repair.deviceModel}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(repair.status)}
                            size="small"
                            color={getStatusColor(repair.status) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            ${repair.totalCost.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(repair.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {repair.completedAt ? (
                            <Typography variant="body2">
                              {format(new Date(repair.completedAt), 'dd/MM/yyyy', { locale: es })}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              En proceso
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}