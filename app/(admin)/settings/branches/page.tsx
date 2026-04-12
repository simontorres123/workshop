"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Paper, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, CircularProgress, Alert, Grid
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuth } from '@/hooks/useAuth';

export default function BranchesPage() {
  const { isOrgAdmin, isSuperAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '' });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      const result = await res.json();
      if (result.success) setBranches(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch)
      });
      const result = await res.json();
      if (result.success) {
        setOpen(false);
        fetchBranches();
      }
    } catch (err) {
      alert('Error creando sucursal');
    }
  };

  if (!isOrgAdmin && !isSuperAdmin) {
    return <Alert severity="error">Acceso Restringido: Se requieren permisos administrativos del taller.</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">Gestión de Sucursales</Typography>
        <Button 
          variant="contained" 
          startIcon={<Icon icon="eva:plus-outline" />}
          onClick={() => setOpen(true)}
        >
          Nueva Sucursal
        </Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <Paper>
          <List>
            {branches.map((branch: any) => (
              <ListItem key={branch.id} divider>
                <ListItemText 
                  primary={branch.name} 
                  secondary={branch.address || "Sin dirección registrada"} 
                />
                <ListItemSecondaryAction>
                  <Chip 
                    label={branch.is_main_branch ? "Matriz" : "Sucursal"} 
                    color={branch.is_main_branch ? "primary" : "default"} 
                    variant="outlined"
                    size="small" 
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Nueva Sucursal</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Nombre de la Sucursal" 
                value={newBranch.name}
                onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Dirección Física" 
                multiline
                rows={2}
                value={newBranch.address}
                onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Teléfono Local" 
                value={newBranch.phone}
                onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Crear Sucursal</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
