"use client";

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Skeleton,
  Alert,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Icon } from '@iconify/react';
import { useClients } from '@/hooks/useClients';
import ClientForm from '@/components/clients/ClientForm';
import ClientsTable from '@/components/clients/ClientsTable';
import ClientHistoryDialog from '@/components/clients/ClientHistoryDialog';
import { Client, CreateClientRequest, UpdateClientRequest } from '@/types/client';

export default function ClientsPage() {
  const {
    clients,
    loading,
    error,
    total,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    refresh,
  } = useClients();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });
  const [historyDialog, setHistoryDialog] = useState({ open: false, client: null as Client | null });

  const handleCreateClient = async (data: CreateClientRequest) => {
    const result = await createClient(data);
    if (result) {
      setFormOpen(false);
      setSnackbar({ open: true, message: 'Cliente creado exitosamente', type: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Error creando cliente', type: 'error' });
    }
  };

  const handleUpdateClient = async (data: UpdateClientRequest) => {
    if (editingClient) {
      const result = await updateClient(editingClient.id, data);
      if (result) {
        setFormOpen(false);
        setEditingClient(null);
        setSnackbar({ open: true, message: 'Cliente actualizado exitosamente', type: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Error actualizando cliente', type: 'error' });
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    const success = await deleteClient(id);
    if (success) {
      setSnackbar({ open: true, message: 'Cliente eliminado exitosamente', type: 'success' });
    } else {
      setSnackbar({ open: true, message: 'Error eliminando cliente', type: 'error' });
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleViewHistory = (client: Client) => {
    setHistoryDialog({ open: true, client });
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchClients({ search: searchQuery.trim() });
    } else {
      await refresh();
    }
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de Clientes
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Administra la información de tus clientes y su historial
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Icon icon="eva:plus-fill" />}
            onClick={handleNewClient}
          >
            Nuevo Cliente
          </Button>
        </Box>

        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6} component="div">
                <TextField
                  fullWidth
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon icon="eva:search-fill" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3} component="div">
                <Button
                  variant="outlined"
                  onClick={handleSearch}
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Buscar
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchQuery('');
                    refresh();
                  }}
                  disabled={loading}
                >
                  Limpiar
                </Button>
              </Grid>
              <Grid item xs={12} md={3} component="div">
                <Typography variant="body2" color="text.secondary" textAlign="right">
                  Total: {total} clientes
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => window.location.reload()}>
            {error}
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <Card>
            <CardContent>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" height={40} />
                  <Skeleton variant="text" height={20} width="60%" />
                </Box>
              ))}
            </CardContent>
          </Card>
        ) : (
          <ClientsTable
            clients={clients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onViewHistory={handleViewHistory}
            loading={loading}
          />
        )}

        {/* Client Form Dialog */}
        <ClientForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
          client={editingClient}
          loading={loading}
        />

        {/* Client History Dialog */}
        <ClientHistoryDialog
          open={historyDialog.open}
          onClose={() => setHistoryDialog({ open: false, client: null })}
          client={historyDialog.client}
        />

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.type}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}