"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Paper, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, CircularProgress, Alert, Divider, IconButton,
  MenuItem, Tooltip, Stack, Switch, FormControlLabel
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/hooks/useAuth';

export default function OrganizationsPage() {
  const { isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    slug: '', 
    organizerName: '', 
    organizerEmail: '' 
  });

  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      const result = await res.json();
      if (result.success) {
        setOrganizations(result.data);
      } else {
        setError(result.error || 'Error cargando organizaciones');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newOrg.name || !newOrg.slug || !newOrg.organizerEmail || !newOrg.organizerName) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrg)
      });
      const result = await res.json();
      if (result.success) {
        setOpen(false);
        setSuccess('¡Taller creado! Se ha enviado un correo de invitación al organizador.');
        setNewOrg({ name: '', slug: '', organizerName: '', organizerEmail: '' });
        fetchOrganizations();
      } else {
        setError(result.error || 'No se pudo crear el taller');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (org: any) => {
    setSelectedOrg({ ...org });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedOrg.name,
          slug: selectedOrg.slug,
          is_active: selectedOrg.is_active,
          subscription_plan: selectedOrg.subscription_plan
        })
      });
      const result = await res.json();
      if (result.success) {
        setEditOpen(false);
        setSuccess('Taller actualizado correctamente');
        fetchOrganizations();
      } else {
        setError(result.error || 'No se pudo actualizar el taller');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (org: any) => {
    const newStatus = !org.is_active;
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(`Taller ${newStatus ? 'activado' : 'desactivado'} correctamente`);
        fetchOrganizations();
      }
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  if (!isSuperAdmin) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Acceso Restringido: Se requieren permisos de Super Administrador.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Gestión de Talleres</Typography>
        <Button 
          variant="contained" 
          startIcon={<Icon icon="eva:plus-outline" />}
          onClick={() => {
            setError(null);
            setSuccess(null);
            setOpen(true);
          }}
        >
          Nuevo Taller
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <List disablePadding>
            {organizations.length === 0 ? (
              <ListItem>
                <ListItemText primary="No hay talleres registrados" />
              </ListItem>
            ) : (
              organizations.map((org: any, index) => (
                <React.Fragment key={org.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemText 
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight="bold">{org.name}</Typography>
                          {!org.is_active && <Chip label="Desactivado" size="small" color="error" variant="soft" />}
                        </Stack>
                      } 
                      secondary={
                        <Box component="div" sx={{ display: 'block', mt: 0.5 }}>
                          <Chip label={`Slug: ${org.slug}`} size="small" variant="outlined" sx={{ mr: 1 }} />
                          <Chip label={`Plan: ${org.subscription_plan}`} size="small" color="primary" variant="outlined" />
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }} 
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={org.is_active ? "Desactivar" : "Activar"}>
                          <Switch 
                            checked={org.is_active} 
                            onChange={() => handleToggleStatus(org)} 
                            size="small"
                            color="success"
                          />
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleEditOpen(org)}>
                          <Icon icon="eva:edit-2-outline" width={20} />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < organizations.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      )}

      {/* Dialog: Nuevo Taller */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Dar de alta nuevo Taller y Organizador</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="overline" color="text.secondary">Información del Taller</Typography>
            <TextField 
              fullWidth label="Nombre del Taller" margin="dense"
              value={newOrg.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                setNewOrg({...newOrg, name, slug});
              }}
              disabled={submitting}
            />
            <TextField 
              fullWidth label="Slug (URL)" margin="dense"
              value={newOrg.slug}
              onChange={(e) => setNewOrg({...newOrg, slug: e.target.value})}
              helperText={`URL: ${newOrg.slug || '...'}.workshoppro.com`}
              disabled={submitting}
              sx={{ mb: 3 }}
            />

            <Typography variant="overline" color="text.secondary">Información del Dueño / Organizador</Typography>
            <TextField 
              fullWidth label="Nombre Completo del Responsable" margin="dense"
              value={newOrg.organizerName}
              onChange={(e) => setNewOrg({...newOrg, organizerName: e.target.value})}
              disabled={submitting}
            />
            <TextField 
              fullWidth label="Correo Electrónico" type="email" margin="dense"
              value={newOrg.organizerEmail}
              onChange={(e) => setNewOrg({...newOrg, organizerEmail: e.target.value})}
              helperText="Se enviará un link de invitación a este correo"
              disabled={submitting}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
          <Button 
            variant="contained" onClick={handleCreate} 
            disabled={submitting || !newOrg.name || !newOrg.organizerEmail}
            startIcon={submitting && <CircularProgress size={20} />}
          >
            Crear Taller e Invitar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Editar Taller */}
      <Dialog open={editOpen} onClose={() => !submitting && setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Taller</DialogTitle>
        <DialogContent>
          {selectedOrg && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField 
                fullWidth label="Nombre del Taller" 
                value={selectedOrg.name}
                onChange={(e) => setSelectedOrg({...selectedOrg, name: e.target.value})}
                disabled={submitting}
              />
              <TextField 
                fullWidth label="Slug (URL)" 
                value={selectedOrg.slug}
                onChange={(e) => setSelectedOrg({...selectedOrg, slug: e.target.value.toLowerCase()})}
                disabled={submitting}
              />
              <TextField 
                fullWidth select label="Plan de Suscripción"
                value={selectedOrg.subscription_plan}
                onChange={(e) => setSelectedOrg({...selectedOrg, subscription_plan: e.target.value})}
                disabled={submitting}
              >
                <MenuItem value="free">Gratis</MenuItem>
                <MenuItem value="pro">Profesional</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </TextField>
              <FormControlLabel
                control={
                  <Switch 
                    checked={selectedOrg.is_active} 
                    onChange={(e) => setSelectedOrg({...selectedOrg, is_active: e.target.checked})}
                  />
                }
                label={selectedOrg.is_active ? "Taller Activo" : "Taller Desactivado"}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>Cancelar</Button>
          <Button 
            variant="contained" onClick={handleUpdate} 
            disabled={submitting || !selectedOrg?.name}
            startIcon={submitting && <CircularProgress size={20} />}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
