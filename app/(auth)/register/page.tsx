/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Alert, 
  Paper,
  InputAdornment,
  IconButton,
  Link as MuiLink,
  useTheme,
  useMediaQuery,
  Fade,
  Slide
} from '@mui/material';
import { Icon } from '@iconify/react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const orgName = formData.get('orgName') as string;

    if (!email || !password || !fullName || !orgName) {
      setError('Por favor, completa todos los campos.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { user, session } = await authService.registerOrganizationAdmin({
        email,
        password,
        fullName,
        orgName
      });

      if (user) {
        useAuthStore.getState().setUser(user);
        
        // Cargar perfil recién creado (contexto de organización/sucursal)
        const profile = await authService.getUserProfile(user.id);
        useAuthStore.getState().setProfile(profile);
      }

      if (session) {
        // Guarda el token en cookie (válido por 1 hora por defecto en Supabase)
        document.cookie = `auth_token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      }

      // Redirige al dashboard directamente
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrar el taller. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left Panel - Brand/Welcome (Solo Desktop) */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            p: 4,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
              opacity: 0.1,
            },
          }}
        >
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center', zIndex: 1, maxWidth: 500 }}>
              <Icon icon="eva:flash-outline" width={80} height={80} style={{ marginBottom: 24 }} />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Empieza hoy mismo
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                Únete a la red de talleres más eficiente
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                {[
                  { icon: 'eva:checkmark-circle-2-outline', text: 'Gestión multi-sucursal nativa' },
                  { icon: 'eva:checkmark-circle-2-outline', text: 'Control total de inventario y reparaciones' },
                  { icon: 'eva:checkmark-circle-2-outline', text: 'Reportes avanzados y notificaciones automáticas' }
                ].map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Icon icon={item.icon} width={24} color="#4ade80" />
                    <Typography variant="body1">{item.text}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Fade>
        </Box>
      )}

      {/* Right Panel - Register Form */}
      <Box
        sx={{
          flex: isMobile ? 1 : 0.8,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 3,
        }}
      >
        <Slide direction="left" in timeout={800}>
          <Paper
            elevation={isMobile ? 0 : 24}
            sx={{
              width: '100%',
              maxWidth: 550,
              padding: isMobile ? 3 : 5,
              borderRadius: isMobile ? 2 : 4,
              background: 'rgba(255, 255, 255, 1)',
            }}
          >
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Crea tu Taller
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configura tu cuenta de administrador y los datos de tu negocio
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  id="fullName"
                  label="Nombre Completo"
                  name="fullName"
                  placeholder="Ej. Juan Pérez"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  required
                  id="orgName"
                  label="Nombre del Taller"
                  name="orgName"
                  placeholder="Ej. Taller Mecánico Pro"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              </Box>

              <TextField
                fullWidth
                required
                id="email"
                label="Correo Electrónico"
                name="email"
                autoComplete="email"
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                required
                name="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                id="password"
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        <Icon icon={showPassword ? 'eva:eye-outline' : 'eva:eye-off-outline'} width={20} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {isSubmitting ? 'Registrando...' : 'Comenzar ahora'}
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  ¿Ya tienes una cuenta?{' '}
                  <MuiLink
                    component={NextLink}
                    href="/login"
                    fontWeight="bold"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Inicia sesión
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Box>
  );
}
