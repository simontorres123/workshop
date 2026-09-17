"use client";

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

export default function ProfilePage() {
  const { profile } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; color: 'error' | 'primary' | 'info' | 'success' }> = {
      'super_admin': { label: 'Super Admin', color: 'error' },
      'org_admin': { label: 'Administrador / Organizador', color: 'primary' },
      'branch_admin': { label: 'Admin Sucursal', color: 'info' },
      'technician': { label: 'Tecnico', color: 'success' },
    };
    return roles[role] || { label: role, color: 'info' as const };
  };

  const handleChangePassword = async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setSaving(true);
      await authService.updatePassword(newPassword);
      setSuccessMsg('Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  const roleConfig = getRoleLabel(profile?.role || '');

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          Mi Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Informacion de tu cuenta y seguridad
        </Typography>

        {/* User Info Card */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 24 }}>
              {profile?.full_name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">{profile?.full_name || 'Sin nombre'}</Typography>
              <Chip
                label={roleConfig.label}
                color={roleConfig.color}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Icon icon="eva:lock-outline" width={22} />
              <Typography variant="h6">Cambiar Contraseña</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Si ingresaste con una contraseña temporal, te recomendamos cambiarla aqui.
            </Typography>

            <Divider sx={{ mb: 3 }} />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Nueva Contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
              />
              <TextField
                fullWidth
                label="Confirmar Nueva Contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={saving || !newPassword || !confirmPassword}
                startIcon={saving ? <CircularProgress size={16} /> : <Icon icon="eva:checkmark-circle-outline" />}
                sx={{ alignSelf: 'flex-end', borderRadius: 2 }}
              >
                Guardar Contraseña
              </Button>
            </Box>
          </CardContent>
        </Card>

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
