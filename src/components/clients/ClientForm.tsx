"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  Grid,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Client, CreateClientRequest, UpdateClientRequest } from '@/types/client';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  client?: Client | null;
  loading?: boolean;
}

export default function ClientForm({ 
  open, 
  onClose, 
  onSubmit, 
  client = null, 
  loading = false 
}: ClientFormProps) {
  const [formData, setFormData] = useState({
    fullName: client?.fullName || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    notes: client?.notes || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es obligatorio';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (formData.phone.trim().length < 10) {
      newErrors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    await onSubmit(submitData);
  };

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {client ? 'Editar Cliente' : 'Nuevo Cliente'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo *"
                value={formData.fullName}
                onChange={handleChange('fullName')}
                error={!!errors.fullName}
                helperText={errors.fullName}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono *"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={loading}
                placeholder="5551234567"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
                placeholder="cliente@example.com"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.address}
                onChange={handleChange('address')}
                disabled={loading}
                multiline
                rows={2}
                placeholder="Dirección completa del cliente"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                value={formData.notes}
                onChange={handleChange('notes')}
                disabled={loading}
                multiline
                rows={3}
                placeholder="Información adicional sobre el cliente"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
          >
            {client ? 'Actualizar' : 'Crear'} Cliente
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}