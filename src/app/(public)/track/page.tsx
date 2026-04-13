"use client";

import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

export default function TrackPage() {
  const [folio, setFolio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!folio.trim()) {
      setError('Por favor ingresa un folio');
      return;
    }

    if (!folio.match(/^REP-\w+$/i)) {
      setError('El folio debe tener el formato REP-XXXXXXXX');
      return;
    }

    setLoading(true);
    
    try {
      // Navegar a la página de resultados
      router.push(`/track/${folio.toUpperCase()}`);
    } catch (err) {
      setError('Error al buscar la reparación');
    } finally {
      setLoading(false);
    }
  };

  const handleFolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFolio(value);
    setError('');
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 6, 
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Icon 
            icon="eva:search-outline" 
            width={64} 
            height={64} 
            color="primary.main"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="h3" component="h1" gutterBottom>
            Consulta tu Reparación
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
            Ingresa el folio de tu reparación para conocer el estado actual y seguir el progreso de tu electrodoméstico.
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto' }}>
          <TextField
            fullWidth
            label="Folio de Reparación"
            placeholder="REP-12345678"
            value={folio}
            onChange={handleFolioChange}
            error={!!error}
            helperText={error || 'Ejemplo: REP-12345678'}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="eva:hash-outline" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading || !folio.trim()}
            startIcon={
              loading ? (
                <Icon icon="eva:loader-outline" className="animate-spin" />
              ) : (
                <Icon icon="eva:search-outline" />
              )
            }
            sx={{ py: 1.5 }}
          >
            {loading ? 'Buscando...' : 'Consultar Estado'}
          </Button>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Information Cards */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
            ¿Cómo funciona?
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Icon 
                  icon="eva:file-text-outline" 
                  width={40} 
                  height={40} 
                  color="primary.main"
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="h6" gutterBottom>
                  1. Ingresa tu folio
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Usa el código que te proporcionamos al recibir tu aparato
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Icon 
                  icon="eva:eye-outline" 
                  width={40} 
                  height={40} 
                  color="primary.main"
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="h6" gutterBottom>
                  2. Ve el estado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consulta el progreso actual y las notas del técnico
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Icon 
                  icon="eva:message-circle-outline" 
                  width={40} 
                  height={40} 
                  color="primary.main"
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="h6" gutterBottom>
                  3. Mantente informado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recibe actualizaciones por WhatsApp y email
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Contact Info */}
        <Box sx={{ textAlign: 'center', mt: 6, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            ¿No encuentras tu folio o tienes alguna duda?
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<Icon icon="eva:phone-outline" />}
              href="tel:+1234567890"
            >
              Llamar
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<Icon icon="eva:message-square-outline" />}
              href="https://wa.me/1234567890"
              target="_blank"
            >
              WhatsApp
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<Icon icon="eva:email-outline" />}
              href="mailto:contacto@taller.com"
            >
              Email
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}