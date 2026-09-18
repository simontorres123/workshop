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
  FormControl,
  InputLabel,
  Select,
  Stack,
  Fade,
  Grow,
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

  // States for Delete
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        branchIds: newMember.branchIds || []
      });

      setSuccessMsg('Miembro invitado exitosamente');
      setInviteDialogOpen(false);
      setNewMember({ email: '', password: '', fullName: '', role: 'technician', branchIds: [] });
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
        branchIds: editUser.branchIds || []
      });
      setEditDialogOpen(false);
      setSuccessMsg('Usuario actualizado');
      loadUsers();
    } catch (err: any) {
      setError('Error al actualizar: ' + err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      setDeleting(true);
      await userService.deleteProfile(deleteUser.id);
      setDeleteDialogOpen(false);
      setSuccessMsg('Usuario eliminado exitosamente');
      loadUsers();
    } catch (err: any) {
      setError('Error al eliminar usuario: ' + err.message);
    } finally {
      setDeleting(false);
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
    return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 'bold' }} />;
  };

  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: 'Usuario',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ 
            bgcolor: 'primary.light', 
            color: 'primary.darker',
            width: 36, 
            height: 36, 
            fontSize: 16,
            fontWeight: 'bold',
            border: '2px solid white',
            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.1)'
          }}>
            {params.value?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="700" noWrap>{params.value || 'Sin nombre'}</Typography>
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
        field: 'all_branches',
        headerName: 'Sucursales',
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          if (params.row.role === 'org_admin' || params.row.role === 'super_admin') {
            return <Typography variant="body2" color="text.secondary">Global</Typography>;
          }
          const branches = params.value || [];
          if (branches.length === 0) return <Typography variant="body2" color="text.secondary">Sin asignar</Typography>;
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', my: 1 }}>
              {branches.map((b: any) => (
                <Chip key={b.id} label={b.name} size="small" variant="outlined" />
              ))}
            </Box>
          );
        }
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
          onClick={() => { 
            setEditUser({ 
              ...params.row, 
              branchIds: params.row.assignedBranches || [] 
            }); 
            setEditDialogOpen(true); 
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Icon icon="eva:trash-2-outline" width={20} color="error" />}
          label="Eliminar"
          onClick={() => { setDeleteUser(params.row); setDeleteDialogOpen(true); }}
        />,
      ],
    },
  ];

  if (loading && users.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="800"
                color="primary.main"
                sx={{ mb: 0.5, display: 'inline-block' }}
              >
                Gestión de Equipo
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                Administra los técnicos y administradores de tu taller
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Icon icon="eva:person-add-outline" />}
              sx={{ 
                borderRadius: 2, 
                flexShrink: 0,
                px: 4,
                boxShadow: '0 8px 16px -8px rgba(0, 167, 111, 0.5)',
                '&:hover': {
                  boxShadow: '0 12px 20px -8px rgba(0, 167, 111, 0.6)',
                }
              }}
              onClick={() => setInviteDialogOpen(true)}
              fullWidth={isMobile}
            >
              Nuevo Miembro
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
        </Grow>

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
              <FormControl fullWidth>
                <InputLabel>Sucursales Asignadas</InputLabel>
                <Select
                  multiple
                  value={newMember.branchIds || []}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMember({ ...newMember, branchIds: typeof val === 'string' ? val.split(',') : val });
                  }}
                  label="Sucursales Asignadas"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const branch = branches.find(b => b.id === value);
                        return <Chip key={value} label={branch?.name || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                <FormControl fullWidth>
                  <InputLabel>Sucursales Asignadas</InputLabel>
                  <Select
                    multiple
                    value={editUser.branchIds || []}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditUser({ ...editUser, branchIds: typeof val === 'string' ? val.split(',') : val });
                    }}
                    label="Sucursales Asignadas"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => {
                          const branch = branches.find(b => b.id === value);
                          return <Chip key={value} label={branch?.name || value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleUpdateUser}>Guardar Cambios</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Eliminar Usuario</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que deseas eliminar a <strong>{deleteUser?.full_name}</strong>?
              Esta acción eliminará su cuenta de acceso y no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleDeleteUser} 
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Icon icon="eva:trash-2-outline" />}
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
