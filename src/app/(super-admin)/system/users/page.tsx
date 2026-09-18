"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { Icon } from '@iconify/react';
import { useAuth } from '@/hooks/useAuth';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization_id: string | null;
  organization?: { id: string; name: string } | null;
  assignedBranches: Array<{ id: string; name: string; organizationId?: string }>;
  created_at?: string;
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  organizationId: string;
  branchIds: string[];
};

const emptyForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'technician',
  organizationId: '',
  branchIds: [],
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Administrador de taller',
  branch_admin: 'Administrador de sucursal',
  technician: 'Técnico',
};

const spanishGridLocale = {
  ...esES.components.MuiDataGrid.defaultProps.localeText,
  paginationDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
    `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
};

export default function SystemUsersPage() {
  const { isSuperAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [users, setUsers] = useState<UserRow[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/users');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'No se pudieron cargar los usuarios');
      setUsers(result.data.users || []);
      setOrganizations(result.data.organizations || []);
      setBranches(result.data.branches || []);
    } catch (error) {
      setMessage({ severity: 'error', text: error instanceof Error ? error.message : 'Error cargando usuarios' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadData();
  }, [isSuperAdmin]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => [
      user.full_name,
      user.email,
      user.organization?.name,
      roleLabels[user.role] || user.role,
      ...user.assignedBranches.map((branch) => branch.name),
    ].some((item) => String(item || '').toLowerCase().includes(value)));
  }, [search, users]);

  const availableBranches = branches.filter((branch) => branch.organization_id === form.organizationId && branch.is_active !== false);

  const openCreate = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setForm({
      fullName: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      organizationId: user.organization_id || '',
      branchIds: user.assignedBranches.map((branch) => branch.id),
    });
    setDialogOpen(true);
  };

  const updateForm = (key: keyof FormState, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'organizationId' ? { branchIds: [] } : {}) }));
  };

  const saveUser = async () => {
    if (!form.fullName || !form.organizationId || (dialogMode === 'create' && (!form.email || !form.password))) {
      setMessage({ severity: 'error', text: 'Completa nombre, taller y las credenciales obligatorias.' });
      return;
    }

    try {
      setSaving(true);
      const response = dialogMode === 'create'
        ? await fetch('/api/system/users/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName, role: form.role, organizationId: form.organizationId, branchIds: form.branchIds }),
          })
        : await fetch(`/api/system/users/${selectedUser?.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: form.fullName, role: form.role, organization_id: form.organizationId, branchIds: form.branchIds }),
          });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo guardar el usuario');
      setDialogOpen(false);
      setMessage({ severity: 'success', text: dialogMode === 'create' ? 'Usuario creado correctamente.' : 'Usuario actualizado correctamente.' });
      await loadData();
    } catch (error) {
      setMessage({ severity: 'error', text: error instanceof Error ? error.message : 'Error guardando usuario' });
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async () => {
    if (!deleteUser) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/system/users/${deleteUser.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo eliminar el usuario');
      setDeleteUser(null);
      setMessage({ severity: 'success', text: 'Usuario eliminado correctamente.' });
      await loadData();
    } catch (error) {
      setMessage({ severity: 'error', text: error instanceof Error ? error.message : 'Error eliminando usuario' });
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'full_name', headerName: 'Usuario', flex: 1.2, minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 36, height: 36 }}>{params.value?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
          <Box sx={{ minWidth: 0 }}><Typography fontWeight={600} noWrap>{params.value || 'Sin nombre'}</Typography><Typography variant="caption" color="text.secondary" noWrap>{params.row.email || 'Sin correo'}</Typography></Box>
        </Box>
      ),
    },
    { field: 'role', headerName: 'Rol', width: 190, renderCell: (params) => <Chip size="small" label={roleLabels[params.value] || params.value} color={params.value === 'super_admin' ? 'error' : 'default'} /> },
    { field: 'organization', headerName: 'Taller', flex: 1, minWidth: 180, valueGetter: (_value, row) => row.organization?.name || 'Sin taller' },
    { field: 'assignedBranches', headerName: 'Sucursales', flex: 1, minWidth: 180, sortable: false, renderCell: (params) => params.row.role === 'super_admin' ? <Typography variant="body2" color="text.secondary">Global</Typography> : <Stack direction="row" flexWrap="wrap" gap={0.5}>{(params.value || []).map((branch: any) => <Chip key={branch.id} size="small" variant="outlined" label={branch.name} />)}</Stack> },
    { field: 'actions', headerName: 'Acciones', type: 'actions', width: 120, getActions: (params) => [
      <Button key="edit" size="small" onClick={() => openEdit(params.row)}>Editar</Button>,
      <Button key="delete" size="small" color="error" onClick={() => setDeleteUser(params.row)}>Eliminar</Button>,
    ] },
  ];

  if (!isSuperAdmin) return <Container><Alert severity="error" sx={{ mt: 4 }}>Acceso restringido a Super Admin.</Alert></Container>;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
          <Box><Typography variant="h4" fontWeight={700}>Usuarios de la plataforma</Typography><Typography color="text.secondary">Gestiona accesos, talleres y sucursales desde un solo lugar.</Typography></Box>
          <Button variant="contained" startIcon={<Icon icon="eva:person-add-outline" />} onClick={openCreate}>Nuevo usuario</Button>
        </Box>

        <Card>
          <CardContent>
            <TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, taller o sucursal..." InputProps={{ startAdornment: <Icon icon="eva:search-outline" width={20} style={{ marginRight: 8, color: '#637381' }} /> }} sx={{ mb: 2 }} />
            {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : <DataGrid rows={filteredUsers} columns={columns} getRowId={(row) => row.id} autoHeight getRowHeight={() => 'auto'} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} localeText={spanishGridLocale} sx={{ border: 0, '& .MuiDataGrid-cell': { py: 1.5, whiteSpace: 'normal' } }} />}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle component="div"><Typography variant="h6">{dialogMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</Typography><Typography variant="body2" color="text.secondary">Asigna el acceso del usuario a un taller y sus sucursales.</Typography></DialogTitle>
        <DialogContent dividers><Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField label="Nombre completo" value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} required fullWidth />
          <TextField label="Correo electrónico" value={form.email} onChange={(event) => updateForm('email', event.target.value)} required={dialogMode === 'create'} disabled={dialogMode === 'edit'} fullWidth />
          {dialogMode === 'create' && <TextField label="Contraseña temporal" type="password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} required fullWidth />}
          <FormControl fullWidth><InputLabel>Rol</InputLabel><Select label="Rol" value={form.role} onChange={(event) => updateForm('role', event.target.value)}>{Object.entries(roleLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>Taller</InputLabel><Select label="Taller" value={form.organizationId} onChange={(event) => updateForm('organizationId', event.target.value)}>{organizations.map((organization) => <MenuItem key={organization.id} value={organization.id}>{organization.name}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth disabled={!form.organizationId || form.role === 'super_admin'}>
            <InputLabel>Sucursales asignadas</InputLabel>
            <Select
              multiple
              label="Sucursales asignadas"
              value={form.branchIds}
              onChange={(event) => updateForm('branchIds', typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(selected as string[]).map((id) => (
                    <Chip key={id} size="small" label={branches.find((branch) => branch.id === id)?.name || id} />
                  ))}
                </Box>
              )}
              MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            >
              {availableBranches.length === 0 ? (
                <MenuItem disabled>No hay sucursales disponibles</MenuItem>
              ) : availableBranches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  <Checkbox checked={form.branchIds.includes(branch.id)} size="small" />
                  <Typography variant="body2">{branch.name}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button><Button onClick={saveUser} variant="contained" disabled={saving}>{saving ? 'Guardando...' : dialogMode === 'create' ? 'Crear usuario' : 'Guardar cambios'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteUser)} onClose={() => !saving && setDeleteUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle component="div">Eliminar usuario</DialogTitle>
        <DialogContent><Typography>¿Deseas eliminar a <strong>{deleteUser?.full_name}</strong>? Esta acción revocará su acceso a la plataforma.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteUser(null)} disabled={saving}>Cancelar</Button><Button color="error" variant="contained" onClick={removeUser} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}><Alert severity={message?.severity || 'info'} onClose={() => setMessage(null)}>{message?.text}</Alert></Snackbar>
    </Container>
  );
}
