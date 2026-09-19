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
  Fade,
  Grow,
  IconButton,
  InputAdornment,
  Stack
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import OrganizationLogo from '@/components/branding/OrganizationLogo';

export default function ProfilePage() {
  const { user, profile } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>((profile as any)?.organizations?.logo_url || null);
  const [logoSaving, setLogoSaving] = useState(false);

  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; color: 'error' | 'primary' | 'info' | 'success' }> = {
      'super_admin': { label: 'Super Admin', color: 'error' },
      'org_admin': { label: 'Administrador Principal', color: 'primary' },
      'branch_admin': { label: 'Admin de Sucursal', color: 'info' },
      'technician': { label: 'Técnico', color: 'success' },
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

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('El logo debe ser PNG, JPG o WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('El logo no puede superar 2 MB.');
      return;
    }
    const body = new FormData();
    body.append('logo', file);
    try {
      setLogoSaving(true);
      const response = await fetch('/api/organization/branding', { method: 'POST', body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar el logo.');
      setLogoUrl(json.logoUrl || null);
      setSuccessMsg('Logo del taller actualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el logo.');
    } finally {
      setLogoSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setLogoSaving(true);
      const body = new FormData();
      body.append('removeLogo', 'true');
      const response = await fetch('/api/organization/branding', { method: 'POST', body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo quitar el logo.');
      setLogoUrl(null);
      setSuccessMsg('Se restauró el logo de Workshop.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el logo.');
    } finally {
      setLogoSaving(false);
    }
  };

  const roleConfig = getRoleLabel(profile?.role || '');

  return (
    <Container maxWidth="md">
      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Fade in timeout={600}>
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              fontWeight="800" 
              color="primary.main"
              sx={{ mb: 1, display: 'inline-block' }}
            >
              Mi Perfil
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              Administra tu información personal y la seguridad de tu cuenta
            </Typography>
          </Box>
        </Fade>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* User Info Card */}
          <Grow in timeout={800}>
            <Box sx={{ flex: 1 }}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 4, 
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                  <Box sx={{ position: 'relative', mb: 3 }}>
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: -4, left: -4, right: -4, bottom: -4,
                        background: 'linear-gradient(45deg, #00A76F, #5BE49B)',
                        borderRadius: '50%',
                        zIndex: 0,
                        animation: 'spin 4s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }} 
                    />
                    <Avatar 
                      sx={{ 
                        bgcolor: 'background.paper', 
                        color: 'primary.main',
                        width: 100, 
                        height: 100, 
                        fontSize: 40,
                        fontWeight: 'bold',
                        position: 'relative',
                        zIndex: 1,
                        border: '4px solid white'
                      }}
                    >
                      {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                  </Box>
                  
                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    {profile?.full_name || 'Sin nombre'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon icon="eva:email-outline" /> {user?.email || 'Sin correo'}
                  </Typography>

                  <Chip
                    label={roleConfig.label}
                    color={roleConfig.color}
                    size="medium"
                    sx={{ fontWeight: 'bold', px: 1, borderRadius: '12px' }}
                  />

                  <Divider sx={{ w: '100%', width: '100%', my: 3 }} />

                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Sucursales Asignadas
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, justifyContent: 'center' }}>
                      {(profile as any)?.role === 'org_admin' ? (
                        <Chip label="Todas las sucursales" size="small" variant="outlined" color="primary" icon={<Icon icon="eva:globe-2-outline" />} />
                      ) : (profile as any)?.assignedBranches?.length > 0 ? (
                        (profile as any)?.all_branches?.map((b: any) => (
                          <Chip key={b.id} label={b.name} size="small" variant="outlined" icon={<Icon icon="eva:pin-outline" />} />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.disabled">Ninguna asignada</Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grow>

          {(profile as any)?.role === 'org_admin' && (
            <Grow in timeout={900}>
              <Box sx={{ flex: 1.2 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, height: '100%', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px)' }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Identidad del taller</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Sube el logo que aparecerá en el encabezado, comprobantes y seguimiento del cliente. Si no hay uno, se usará el logo de Workshop.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Box sx={{ width: 76, height: 76, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', bgcolor: 'background.paper' }}>
                        <OrganizationLogo logoUrl={logoUrl} size={60} alt="Logo del taller" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2">Logo actual</Typography>
                        <Typography variant="caption" color="text.secondary">PNG, JPG o WebP · máximo 2 MB</Typography>
                      </Box>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button component="label" variant="contained" disabled={logoSaving} startIcon={logoSaving ? <CircularProgress size={18} color="inherit" /> : <Icon icon="eva:cloud-upload-outline" />}>
                        Subir logo<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                      </Button>
                      {logoUrl && <Button variant="outlined" color="inherit" onClick={handleRemoveLogo} disabled={logoSaving}>Usar logo predeterminado</Button>}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Grow>
          )}

          {/* Change Password Card */}
          <Grow in timeout={1000}>
            <Box sx={{ flex: 1.2 }}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 4,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main', display: 'flex' }}>
                      <Icon icon="eva:shield-outline" width={24} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold">Seguridad</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, ml: 6 }}>
                    Actualiza tu contraseña para mantener tu cuenta protegida.
                  </Typography>

                  {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      fullWidth
                      label="Nueva Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              <Icon icon={showPassword ? "eva:eye-outline" : "eva:eye-off-outline"} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Confirmar Nueva Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleChangePassword}
                        disabled={saving || !newPassword || !confirmPassword}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Icon icon="eva:save-outline" />}
                        sx={{ 
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: 'bold',
                          boxShadow: '0 8px 16px -8px rgba(0, 167, 111, 0.5)',
                          '&:hover': {
                            boxShadow: '0 12px 20px -8px rgba(0, 167, 111, 0.6)',
                          }
                        }}
                      >
                        Actualizar Contraseña
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grow>
        </Box>

        <Snackbar
          open={!!successMsg}
          autoHideDuration={5000}
          onClose={() => setSuccessMsg(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled" sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}>
            {successMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}
