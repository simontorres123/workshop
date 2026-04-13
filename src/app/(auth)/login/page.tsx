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
        document.cookie = `auth_token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
      }

      if (user) {
        setUser(user);
        const profile = await authService.getUserProfile(user.id);
        useAuthStore.getState().setProfile(profile);
      }

      router.push('/dashboard');
    } catch {
      setError('Correo o contrasena incorrectos');
      setUser(null);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: isMobile ? '#F9FAFB' : '#161C24' }}>
      {/* Left Panel - Brand */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1.2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            p: 6,
          }}
        >
          {/* Abstract SVG background pattern */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.06,
              background: `radial-gradient(circle at 20% 50%, #5BE49B 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, #00A76F 0%, transparent 40%),
                           radial-gradient(circle at 60% 80%, #007867 0%, transparent 45%)`,
            }}
          />

          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              width: 400,
              height: 400,
              border: '1px solid',
              borderColor: 'rgba(91, 228, 155, 0.08)',
              borderRadius: '50%',
              top: '10%',
              left: '-5%',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 300,
              height: 300,
              border: '1px solid',
              borderColor: 'rgba(0, 167, 111, 0.1)',
              borderRadius: '50%',
              bottom: '5%',
              right: '-3%',
            }}
          />

          <Box sx={{ zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
            {/* Logo icon */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '20px',
                bgcolor: 'rgba(0, 167, 111, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 4,
              }}
            >
              <Icon icon="solar:settings-bold-duotone" width={40} color="#5BE49B" />
            </Box>

            <Typography variant="h3" fontWeight={800} color="#FFFFFF" gutterBottom>
              Workshop Pro
            </Typography>

            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.64)', lineHeight: 1.8, mt: 2 }}>
              Sistema integral de gestion para tu taller.
              Reparaciones, inventario, clientes y mas en una sola plataforma.
            </Typography>

            {/* Feature pills */}
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mt: 5 }}>
              {['Reparaciones', 'Inventario', 'Clientes', 'Reportes'].map((item) => (
                <Box
                  key={item}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: '8px',
                    bgcolor: 'rgba(0, 167, 111, 0.08)',
                    border: '1px solid rgba(91, 228, 155, 0.12)',
                    color: '#5BE49B',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {item}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Right Panel - Login Form */}
      <Box
        sx={{
          flex: isMobile ? 1 : 0.8,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: isMobile ? '#F9FAFB' : '#FFFFFF',
          borderRadius: isMobile ? 0 : '24px 0 0 24px',
          p: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          {isMobile && (
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  bgcolor: 'rgba(0, 167, 111, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Icon icon="solar:settings-bold-duotone" width={32} color="#00A76F" />
              </Box>
              <Typography variant="h5" fontWeight={800} color="primary">
                Workshop Pro
              </Typography>
            </Box>
          )}

          {/* Header */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              Bienvenido
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inicia sesion para acceder a tu panel de control
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              name="email"
              label="Correo Electronico"
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon icon="solar:letter-bold-duotone" width={22} color="#919EAB" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2.5 }}
            />

            <TextField
              fullWidth
              name="password"
              label="Contrasena"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon icon="solar:lock-bold-duotone" width={22} color="#919EAB" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      <Icon
                        icon={showPassword ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'}
                        width={22}
                        color="#919EAB"
                      />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />

            {/* Forgot password */}
            <Box sx={{ textAlign: 'right', mb: 3 }}>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                sx={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'color 0.2s',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                Olvidaste tu contrasena?
              </Link>
            </Box>

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                mb: 3,
                py: 1.5,
                bgcolor: '#00A76F',
                fontSize: '0.95rem',
                '&:hover': {
                  bgcolor: '#007867',
                },
              }}
              startIcon={
                isSubmitting ? (
                  <Icon icon="svg-spinners:ring-resize" width={20} />
                ) : (
                  <Icon icon="solar:login-3-bold-duotone" width={20} />
                )
              }
            >
              {isSubmitting ? 'Iniciando sesion...' : 'Iniciar Sesion'}
            </Button>

            {/* Divider */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                my: 3,
                '&::before, &::after': {
                  content: '""',
                  flex: 1,
                  height: '1px',
                  bgcolor: '#DFE3E8',
                },
              }}
            >
              <Typography variant="caption" color="text.disabled" sx={{ px: 2, fontWeight: 600 }}>
                O
              </Typography>
            </Box>

            {/* Social */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 4 }}>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  py: 1.2,
                  borderColor: '#DFE3E8',
                  color: 'text.primary',
                  '&:hover': { borderColor: '#919EAB', bgcolor: 'rgba(145,158,171,0.08)' },
                }}
              >
                <Icon icon="logos:google-icon" width={20} />
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  py: 1.2,
                  borderColor: '#DFE3E8',
                  color: 'text.primary',
                  '&:hover': { borderColor: '#919EAB', bgcolor: 'rgba(145,158,171,0.08)' },
                }}
              >
                <Icon icon="mdi:github" width={22} />
              </Button>
            </Box>

            {/* Register link */}
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No tienes cuenta?{' '}
              <Link
                component={NextLink}
                href="/register"
                fontWeight={700}
                color="primary"
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Registrate aqui
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
