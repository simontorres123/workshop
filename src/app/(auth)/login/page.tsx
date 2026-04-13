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
  Link,
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

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    try {
      const { user, session } = await authService.signInWithEmail(email, password);
      
      if (session) {
        // Guarda el token en cookie (válido por 1 hora por defecto en Supabase)
        // Es vital que esto ocurra antes de cualquier redirección o cambio de estado
        document.cookie = `auth_token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      }

      if (user) {
        setUser(user);
        
        // Cargar perfil completo (contexto de organización/sucursal)
        const profile = await authService.getUserProfile(user.id);
        useAuthStore.getState().setProfile(profile);
      }

      // Redirige a dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      setError('Correo o contraseña incorrectos');
      setUser(null);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: isMobile 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left Panel - Brand/Welcome */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
              opacity: 0.1,
            },
          }}
        >
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center', zIndex: 1, maxWidth: 400, px: 4 }}>
              <Icon 
                icon="eva:settings-2-outline" 
                width={80} 
                height={80}
                style={{ marginBottom: 24 }}
              />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Workshop Pro
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
                Sistema de Gestión de Reparaciones
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.7 }}>
                Administra tu taller de manera profesional. Gestiona órdenes de reparación, 
                clientes, inventario y mucho más desde una sola plataforma.
              </Typography>
            </Box>
          </Fade>
        </Box>
      )}

      {/* Right Panel - Login Form */}
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
              maxWidth: 480,
              padding: isMobile ? 3 : 5,
              borderRadius: isMobile ? 2 : 4,
              background: isMobile 
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 1)',
              backdropFilter: isMobile ? 'blur(20px)' : 'none',
              border: isMobile ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {isMobile && (
                <Box sx={{ mb: 3 }}>
                  <Icon 
                    icon="eva:settings-2-outline" 
                    width={60} 
                    height={60}
                    color={theme.palette.primary.main}
                  />
                  <Typography variant="h5" fontWeight="bold" color="primary" sx={{ mt: 1 }}>
                    Workshop Pro
                  </Typography>
                </Box>
              )}
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                ¡Bienvenido de vuelta!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Inicia sesión para acceder a tu panel de control
              </Typography>
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Correo Electrónico"
                name="email"
                autoComplete="email"
                autoFocus
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon icon="eva:email-outline" width={20} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    },
                  },
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon icon="eva:lock-outline" width={20} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        <Icon 
                          icon={showPassword ? 'eva:eye-outline' : 'eva:eye-off-outline'} 
                          width={20}
                        />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    },
                  },
                }}
              />

              {/* Forgot Password Link */}
              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link
                  href="#"
                  variant="body2"
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>

              {/* Error Alert */}
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      alignItems: 'center',
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  mt: 2,
                  mb: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.35)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                  },
                  transition: 'all 0.3s ease',
                }}
                startIcon={
                  isSubmitting ? (
                    <Icon icon="eva:loader-outline" width={20} className="rotating" />
                  ) : (
                    <Icon icon="eva:log-in-outline" width={20} />
                  )
                }
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>

              {/* Divider */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                my: 3,
                '&::before, &::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  background: 'divider',
                },
              }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ px: 2 }}
                >
                  O continúa con
                </Typography>
              </Box>

              {/* Social Login Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Icon icon="eva:google-fill" width={20} />}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50',
                    },
                  }}
                >
                  Google
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Icon icon="eva:github-fill" width={20} />}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50',
                    },
                  }}
                >
                  GitHub
                </Button>
              </Box>

              {/* Sign Up Link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  ¿No tienes cuenta?{' '}
                  <Link
                    component={NextLink}
                    href="/register"
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Regístrate aquí
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Slide>
      </Box>

      {/* CSS for rotating animation */}
      <style jsx global>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </Box>
  );
}
