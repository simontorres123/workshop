"use client";

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  MenuItem,
  Avatar,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { userService } from '@/services/user.service';
import { supabase } from '@/lib/supabase/client';

export default function UsersManagementPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for Invite Dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'technician' as any,
    branchId: ''
  });

  // States for Edit Dialog
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        if (!profile) setError('Tiempo de espera agotado al cargar el perfil.');
      }
    }, 5000);

    if (profile?.organization_id) {
      loadUsers();
      loadBranches();
      clearTimeout(timeout);
    } else if (profile !== undefined && !profile) {
       setLoading(false);
       setError('No se encontró un perfil activo. Por favor, inicie sesión de nuevo.');
       clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [profile]);

  const loadUsers = async () => {
    if (!profile?.organization_id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getOrganizationUsers(profile.organization_id);
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    if (!profile?.organization_id) return;
    try {
      const { data, error: bError } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true);

      if (bError) throw bError;
      setBranches(data || []);
    } catch (err: any) {
      console.error('Error loading branches:', err);
    }
  };

  const handleInvite = async () => {
    try {
      setInviting(true);
      setError(null);
      await userService.inviteTeamMember({
        ...newMember,
        organizationId: profile!.organization_id!,
        branchId: newMember.branchId || null
      });

      setSuccessMsg('Miembro invitado exitosamente');
      setInviteDialogOpen(false);
      setNewMember({ email: '', password: '', fullName: '', role: 'technician', branchId: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      await userService.updateUser(editUser.id, {
        role: editUser.role,
        full_name: editUser.full_name,
        branch_id: editUser.branch_id || null
      });
      setEditDialogOpen(false);
      setSuccessMsg('Usuario actualizado');
      loadUsers();
    } catch (err: any) {
      setError('Error al actualizar: ' + err.message);
    }
  };

  const getRoleChip = (role: string) => {
    const roles: Record<string, { label: string; color: 'error' | 'primary' | 'info' | 'success' | 'default' }> = {
      'super_admin': { label: 'Super Admin', color: 'error' },
      'org_admin': { label: 'Dueño / Admin Org', color: 'primary' },
      'branch_admin': { label: 'Admin Sucursal', color: 'info' },
      'technician': { label: 'Técnico', color: 'success' }
    };
    const config = roles[role] || { label: role, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
  };

  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: 'Usuario',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
            {params.value?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" noWrap>{params.value || 'Sin nombre'}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Rol',
      width: 170,
      renderCell: (params) => getRoleChip(params.value),
    },
    ...(!isMobile ? [
      {
        field: 'branches',
        headerName: 'Sucursal',
        flex: 1,
        minWidth: 150,
        valueGetter: (value: any) => value?.name || 'Acceso Global',
      } as GridColDef,
      {
        field: 'created_at',
        headerName: 'Registro',
        width: 120,
        valueGetter: (value: string) =>
          value ? new Date(value).toLocaleDateString() : '—',
      } as GridColDef,
    ] : []),
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 60,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Icon icon="eva:edit-2-outline" width={20} />}
          label="Editar"
          onClick={() => { setEditUser(params.row); setEditDialogOpen(true); }}
        />,
      ],
    },
  ];

  if (loading && users.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Gestión de Equipo</Typography>
            <Typography variant="body1" color="text.secondary">
              Administra los técnicos y administradores de tu taller
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Icon icon="eva:person-add-outline" />}
            sx={{ borderRadius: 2, flexShrink: 0 }}
            onClick={() => setInviteDialogOpen(true)}
            fullWidth={isMobile}
          >
            Nuevo Miembro
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <DataGrid
            rows={users}
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

        {/* Invite Dialog */}
        <Dialog
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>Añadir Nuevo Miembro al Equipo</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                El usuario será creado inmediatamente y podrá iniciar sesión con estas credenciales.
              </Typography>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={newMember.fullName}
                onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                placeholder="Ej. Pedro Picapiedra"
              />
              <TextField
                fullWidth
                label="Correo Electrónico"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="tecnico@taller.com"
              />
              <TextField
                fullWidth
                label="Contraseña Temporal"
                type="password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
              />
              <TextField
                fullWidth
                select
                label="Rol"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              >
                <MenuItem value="branch_admin">Admin Sucursal</MenuItem>
                <MenuItem value="technician">Técnico</MenuItem>
              </TextField>
              <TextField
                fullWidth
                select
                label="Sucursal Asignada"
                value={newMember.branchId}
                onChange={(e) => setNewMember({ ...newMember, branchId: e.target.value })}
              >
                <MenuItem value="">Acceso Global</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleInvite}
              disabled={inviting || !newMember.email || !newMember.password}
              startIcon={inviting ? <CircularProgress size={16} /> : null}
            >
              Crear Cuenta
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          fullWidth
          maxWidth="xs"
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Miembro</DialogTitle>
          <DialogContent>
            {editUser && (
              <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="Nombre Completo"
                  value={editUser.full_name}
                  onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                />
                <TextField
                  fullWidth
                  select
                  label="Rol"
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                >
                  <MenuItem value="org_admin">Admin Organización (Dueño)</MenuItem>
                  <MenuItem value="branch_admin">Admin Sucursal</MenuItem>
                  <MenuItem value="technician">Técnico</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="Sucursal"
                  value={editUser.branch_id || ''}
                  onChange={(e) => setEditUser({ ...editUser, branch_id: e.target.value })}
                >
                  <MenuItem value="">Acceso Global</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleUpdateUser}>Guardar Cambios</Button>
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
