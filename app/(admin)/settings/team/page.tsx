"use client";

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Snackbar
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { userService } from '@/services/user.service';
import { supabase } from '@/lib/supabase/client';

export default function UsersManagementPage() {
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
    // Seguridad para evitar spinner infinito si algo falla
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        if (!profile) setError('Tiempo de espera agotado al cargar el perfil.');
      }
    }, 5000);

    if (profile?.organization_id) {
      console.log('User profile loaded, fetching team data for org:', profile.organization_id);
      loadUsers();
      loadBranches();
      clearTimeout(timeout);
    } else if (profile !== undefined && !profile) {
       // Si el profile ya se intentó cargar y es null
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
    const roles: any = {
      'super_admin': { label: 'Super Admin', color: 'error' },
      'org_admin': { label: 'Dueño / Admin Org', color: 'primary' },
      'branch_admin': { label: 'Admin Sucursal', color: 'info' },
      'technician': { label: 'Técnico', color: 'success' }
    };
    const config = roles[role] || { label: role, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
  };

  if (loading && users.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Gestión de Equipo</Typography>
            <Typography variant="body1" color="text.secondary">
              Administra los técnicos y administradores de tu taller
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<Icon icon="eva:person-add-outline" />}
            sx={{ borderRadius: 2 }}
            onClick={() => setInviteDialogOpen(true)}
          >
            Nuevo Miembro
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Sucursal</TableCell>
                  <TableCell>Registro</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">No hay otros miembros en este taller aún.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {user.full_name?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{user.full_name || 'Sin nombre'}</Typography>
                            <Typography variant="caption" color="text.secondary">ID: {user.id.substring(0, 8)}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{getRoleChip(user.role)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon icon="eva:pin-outline" />
                          {user.branches?.name || 'Acceso Global'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => { setEditUser(user); setEditDialogOpen(true); }}>
                          <Icon icon="eva:edit-2-outline" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} fullWidth maxWidth="sm">
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
              <Grid container spacing={2}>
                <Grid item xs={6}>
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
                </Grid>
                <Grid item xs={6}>
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
                </Grid>
              </Grid>
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
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
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
