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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
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

      if (user && !session) {
        setSuccessMessage('¡Taller registrado exitosamente! Por favor, verifica la bandeja de entrada (o spam) de tu correo electrónico para activar tu cuenta.');
        // Limpiamos los datos del formulario (opcional) pero dejamos la pantalla para que lea el mensaje
        setIsSubmitting(false);
        return;
      }

      if (session) {
        // Guarda el token en cookie (válido por 1 hora por defecto en Supabase)
        document.cookie = `auth_token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
        // Redirige al dashboard directamente solo si ya hay sesión activa
        router.push('/dashboard');
      }
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
        backgroundColor: '#F7F9FA',
      }}
    >
      {/* Left Panel - Brand/Welcome (Solo Desktop) */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1.15,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            p: 4,
            backgroundImage: "url('/images/register-workshop-hero.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(90deg, rgba(15, 61, 54, 0.96) 0%, rgba(15, 61, 54, 0.8) 42%, rgba(15, 61, 54, 0.18) 100%)',
            },
          }}
        >
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center', zIndex: 1, maxWidth: 500 }}>
              <Icon icon="eva:settings-2-outline" width={64} height={64} style={{ marginBottom: 24 }} />
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
          flex: isMobile ? 1 : 0.85,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { xs: 2, sm: 3, md: 5 },
          backgroundColor: '#F7F9FA',
        }}
      >
        <Slide direction="left" in timeout={800}>
          <Paper
            elevation={isMobile ? 0 : 24}
            sx={{
              width: '100%',
              maxWidth: 550,
              padding: isMobile ? 3 : 5,
              borderRadius: isMobile ? 2 : 3,
              background: 'rgba(255, 255, 255, 1)',
              border: isMobile ? 'none' : '1px solid #E3E9ED',
              boxShadow: isMobile ? 'none' : '0 18px 50px rgba(36, 49, 63, 0.10)',
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
              {successMessage ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Alert severity="success" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
                    {successMessage}
                  </Alert>
                  <Button
                    component={NextLink}
                    href="/login"
                    variant="contained"
                    fullWidth
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    Ir al Inicio de Sesión
                  </Button>
                </Box>
              ) : (
                <>
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
                  backgroundColor: '#00A878',
                  '&:hover': {
                    backgroundColor: '#008F68',
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
            </>
            )}
          </Box>
        </Paper>
        </Slide>
      </Box>
    </Box>
  );
}
