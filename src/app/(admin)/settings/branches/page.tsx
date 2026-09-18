"use client";

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, CircularProgress, Alert, Snackbar, Card,
  useMediaQuery, useTheme, Fade, Grow,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Icon } from '@iconify/react';
import { useAuth } from '@/hooks/useAuth';

interface BranchForm {
  name: string;
  address: string;
  phone: string;
}

const emptyForm: BranchForm = { name: '', address: '', phone: '' };

export default function BranchesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isOrgAdmin, isSuperAdmin } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/branches');
      const result = await res.json();
      if (result.success) {
        setBranches(result.data || []);
      } else {
        setError(result.error || 'Error al cargar sucursales');
      }
    } catch {
      setError('Error de conexión al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (branch: any) => {
    setDialogMode('edit');
    setEditingId(branch.id);
    setForm({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (branch: any) => {
    setDeletingBranch(branch);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('El nombre de la sucursal es requerido');
      return;
    }
    try {
      setSaving(true);
      setError(null);

      const isEdit = dialogMode === 'edit' && editingId;
      const url = isEdit ? `/api/branches/${editingId}` : '/api/branches';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();

      if (result.success) {
        setDialogOpen(false);
        setForm(emptyForm);
        setSuccessMsg(isEdit ? 'Sucursal actualizada' : 'Sucursal creada exitosamente');
        fetchBranches();
      } else {
        setError(result.error || 'Error guardando sucursal');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`/api/branches/${deletingBranch.id}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.success) {
        setDeleteDialogOpen(false);
        setDeletingBranch(null);
        setSuccessMsg('Sucursal eliminada');
        fetchBranches();
      } else {
        setError(result.error || 'Error eliminando sucursal');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
    },
    ...(!isMobile ? [
      {
        field: 'address',
        headerName: 'Dirección',
        flex: 1.5,
        minWidth: 180,
        valueGetter: (value: string | null) => value || 'Sin dirección',
      } as GridColDef,
      {
        field: 'phone',
        headerName: 'Teléfono',
        width: 140,
        valueGetter: (value: string | null) => value || '—',
      } as GridColDef,
    ] : []),
    {
      field: 'is_main_branch',
      headerName: 'Tipo',
      width: isMobile ? 90 : 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Matriz' : 'Sucursal'}
          color={params.value ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    ...(!isMobile ? [
      {
        field: 'is_active',
        headerName: 'Estado',
        width: 110,
        renderCell: (params: any) => (
          <Chip
            label={params.value ? 'Activa' : 'Inactiva'}
            color={params.value ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        ),
      } as GridColDef,
    ] : []),
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: isMobile ? 50 : 100,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="edit"
            icon={<Icon icon="eva:edit-2-outline" width={20} />}
            label="Editar"
            onClick={() => openEditDialog(params.row)}
          />,
        ];

        if (!params.row.is_main_branch) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<Icon icon="eva:trash-2-outline" width={20} color="#FF5630" />}
              label="Eliminar"
              onClick={() => openDeleteDialog(params.row)}
            />
          );
        }

        return actions;
      },
    },
  ];

  if (!isOrgAdmin && !isSuperAdmin) {
    return <Alert severity="error">Acceso Restringido: Se requieren permisos administrativos del taller.</Alert>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Fade in timeout={600}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="800"
                color="primary.main"
                sx={{ mb: 0.5, display: 'inline-block' }}
              >
                Gestión de Sucursales
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                Administra las sucursales de tu taller
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Icon icon="eva:plus-outline" />}
              sx={{ 
                borderRadius: 2, 
                flexShrink: 0,
                px: 4,
                boxShadow: '0 8px 16px -8px rgba(0, 167, 111, 0.5)',
                '&:hover': {
                  boxShadow: '0 12px 20px -8px rgba(0, 167, 111, 0.6)',
                }
              }}
              onClick={openCreateDialog}
              fullWidth={isMobile}
            >
              Nueva Sucursal
            </Button>
          </Box>
        </Fade>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

        <Grow in timeout={800}>
          <Card 
            elevation={0} 
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(20px)',
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
              }
            }}
          >
            <DataGrid
              rows={branches}
              columns={columns}
              loading={loading}
              autoHeight
              disableRowSelectionOnClick
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
              }}
              pageSizeOptions={[5, 10, 25]}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50' },
                '& .MuiDataGrid-cell': { py: 1 },
              }}
            />
          </Card>
        </Grow>

        {/* Dialog Crear / Editar */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {dialogMode === 'edit' ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Nombre de la Sucursal"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Sucursal Norte"
              />
              <TextField
                fullWidth
                label="Dirección Física"
                multiline
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <TextField
                fullWidth
                label="Teléfono Local"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {dialogMode === 'edit' ? 'Guardar Cambios' : 'Crear Sucursal'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Confirmar Eliminación */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Eliminar Sucursal</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que deseas eliminar la sucursal <strong>{deletingBranch?.name}</strong>? Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <Icon icon="eva:trash-2-outline" />}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!successMsg}
          autoHideDuration={4000}
          onClose={() => setSuccessMsg(null)}
          message={successMsg}
        />
      </Box>
    </Container>
  );
}
