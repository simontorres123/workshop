"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';
import { RepairOrder, CreateRepairOrderRequest } from '@/types/repair';
import { useRepairOrders } from '@/hooks/useRepairOrders';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageMetadata } from '@/types';

interface RepairOrderFormProps {
  order?: RepairOrder | null;
  onSave: (data: CreateRepairOrderRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

const deviceTypes = [
  'Lavadora',
  'Refrigerador',
  'Microondas',
  'Licuadora',
  'Aspiradora',
  'Cafetera',
  'Tostadora',
  'Plancha',
  'Ventilador',
  'Otro'
];

const deviceBrands = [
  'LG',
  'Samsung',
  'Whirlpool',
  'Electrolux',
  'Mabe',
  'GE',
  'Panasonic',
  'Sony',
  'Philips',
  'Black+Decker',
  'Oster',
  'Hamilton Beach',
  'Otro'
];

export default function RepairOrderForm({ 
  order, 
  onSave, 
  onCancel, 
  loading = false 
}: RepairOrderFormProps) {
  const { createOrder, updateOrder } = useRepairOrders();
  const [formData, setFormData] = useState<CreateRepairOrderRequest>({
    clientName: order?.clientName || '',
    clientPhone: order?.clientPhone || '',
    clientEmail: order?.clientEmail || '',
    deviceType: order?.deviceType || '',
    deviceBrand: order?.deviceBrand || '',
    deviceModel: order?.deviceModel || '',
    deviceSerial: order?.deviceSerial || '',
    deviceDescription: order?.deviceDescription || '',
    problemDescription: order?.problemDescription || '',
    initialDiagnosis: order?.initialDiagnosis || '',
    warrantyPeriodMonths: order?.warrantyPeriodMonths || 3,
    storagePeriodMonths: order?.storagePeriodMonths || 1,
    totalCost: order?.totalCost || undefined,
    clientId: order?.clientId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageMetadata[]>([]);

  // Inicializar imágenes si estamos editando una orden existente
  useEffect(() => {
    if (order?.images) {
      // Convertir URLs a objetos ImageMetadata para mostrar en el componente
      const existingImages: ImageMetadata[] = order.images.map((url, index) => ({
        _id: `existing-${index}`,
        filename: url.split('/').pop() || 'image',
        originalName: url.split('/').pop() || 'image',
        url: url,
        blobName: url.split('/').pop() || 'image',
        containerName: 'repair-images',
        mimeType: 'image/jpeg',
        size: 0,
        uploadedAt: new Date()
      }));
      setImages(existingImages);
    }
  }, [order]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'El nombre del cliente es obligatorio';
    }

    if (!formData.clientPhone.trim()) {
      newErrors.clientPhone = 'El teléfono es obligatorio';
    } else if (formData.clientPhone.length < 10) {
      newErrors.clientPhone = 'El teléfono debe tener al menos 10 dígitos';
    }

    if (!formData.deviceType) {
      newErrors.deviceType = 'El tipo de dispositivo es obligatorio';
    }

    if (!formData.deviceBrand.trim()) {
      newErrors.deviceBrand = 'La marca es obligatoria';
    }

    if (!formData.deviceDescription.trim()) {
      newErrors.deviceDescription = 'La descripción del dispositivo es obligatoria';
    } else if (formData.deviceDescription.length < 10) {
      newErrors.deviceDescription = 'La descripción debe tener al menos 10 caracteres';
    }

    if (!formData.problemDescription.trim()) {
      newErrors.problemDescription = 'La descripción del problema es obligatoria';
    } else if (formData.problemDescription.length < 10) {
      newErrors.problemDescription = 'La descripción del problema debe tener al menos 10 caracteres';
    }

    if (!formData.initialDiagnosis.trim()) {
      newErrors.initialDiagnosis = 'El diagnóstico inicial es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof CreateRepairOrderRequest) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Incluir las URLs de las imágenes en los datos del formulario
      // Al editar, mantener todas las imágenes (existentes + nuevas)
      const allImageUrls = images.map(image => image.url);
      
      const orderData = {
        ...formData,
        images: allImageUrls
      };

      if (order) {
        // Actualizar orden existente
        await updateOrder(order.id, orderData);
      } else {
        // Crear nueva orden
        await createOrder(orderData);
      }
      onSave(orderData);
    } catch (error) {
      console.error('Error saving repair order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        {/* Información del Cliente */}
        <Card variant="outlined">
          <CardHeader
            avatar={<Icon icon="eva:person-outline" width={20} />}
            title="Información del Cliente"
            slotProps={{ 
              title: { variant: 'subtitle1', fontWeight: 600 } 
            }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2.5}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Nombre Completo *"
                  value={formData.clientName}
                  onChange={handleChange('clientName')}
                  error={!!errors.clientName}
                  helperText={errors.clientName}
                  disabled={loading || isSubmitting}
                />
                <TextField
                  fullWidth
                  label="Teléfono *"
                  value={formData.clientPhone}
                  onChange={handleChange('clientPhone')}
                  error={!!errors.clientPhone}
                  helperText={errors.clientPhone}
                  disabled={loading || isSubmitting}
                  placeholder="5551234567"
                />
              </Box>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.clientEmail || ''}
                onChange={handleChange('clientEmail')}
                error={!!errors.clientEmail}
                helperText={errors.clientEmail}
                disabled={loading || isSubmitting}
                placeholder="cliente@example.com"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Información del Dispositivo */}
        <Card variant="outlined">
          <CardHeader
            avatar={<Icon icon="eva:settings-outline" width={20} />}
            title="Información del Dispositivo"
            slotProps={{ 
              title: { variant: 'subtitle1', fontWeight: 600 } 
            }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <FormControl fullWidth error={!!errors.deviceType} size="medium">
                  <InputLabel>Tipo de Dispositivo *</InputLabel>
                  <Select
                    value={formData.deviceType}
                    label="Tipo de Dispositivo *"
                    onChange={(e) => handleChange('deviceType')({ target: { value: e.target.value } })}
                    disabled={loading || isSubmitting}
                  >
                    {deviceTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.deviceType && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      {errors.deviceType}
                    </Typography>
                  )}
                </FormControl>
                <FormControl fullWidth error={!!errors.deviceBrand} size="medium">
                  <InputLabel>Marca *</InputLabel>
                  <Select
                    value={formData.deviceBrand}
                    label="Marca *"
                    onChange={(e) => handleChange('deviceBrand')({ target: { value: e.target.value } })}
                    disabled={loading || isSubmitting}
                  >
                    {deviceBrands.map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.deviceBrand && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      {errors.deviceBrand}
                    </Typography>
                  )}
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Modelo"
                  value={formData.deviceModel || ''}
                  onChange={handleChange('deviceModel')}
                  disabled={loading || isSubmitting}
                  placeholder="Ej: WF-101"
                />
                <TextField
                  fullWidth
                  label="Número de Serie"
                  value={formData.deviceSerial || ''}
                  onChange={handleChange('deviceSerial')}
                  disabled={loading || isSubmitting}
                />
              </Box>
              <TextField
                fullWidth
                label="Descripción del Dispositivo *"
                multiline
                rows={3}
                value={formData.deviceDescription}
                onChange={handleChange('deviceDescription')}
                error={!!errors.deviceDescription}
                helperText={errors.deviceDescription || 'Describe las características del dispositivo'}
                disabled={loading || isSubmitting}
                placeholder="Ej: Lavadora automática de 10kg, color blanco, con display digital"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Problema y Diagnóstico */}
        <Card variant="outlined">
          <CardHeader
            avatar={<Icon icon="eva:alert-circle-outline" width={20} />}
            title="Problema y Diagnóstico"
            slotProps={{ 
              title: { variant: 'subtitle1', fontWeight: 600 } 
            }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Descripción del Problema *"
                multiline
                rows={3}
                value={formData.problemDescription}
                onChange={handleChange('problemDescription')}
                error={!!errors.problemDescription}
                helperText={errors.problemDescription || 'Describe detalladamente el problema reportado'}
                disabled={loading || isSubmitting}
                placeholder="Ej: La lavadora no enciende al presionar el botón de poder, no hay luces ni sonidos"
              />
              <TextField
                fullWidth
                label="Diagnóstico Inicial *"
                multiline
                rows={2}
                value={formData.initialDiagnosis}
                onChange={handleChange('initialDiagnosis')}
                error={!!errors.initialDiagnosis}
                helperText={errors.initialDiagnosis || 'Diagnóstico preliminar del problema'}
                disabled={loading || isSubmitting}
                placeholder="Ej: Posible problema en la fuente de poder o placa principal"
              />
              <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                <TextField
                  fullWidth
                  label="Costo Estimado"
                  type="number"
                  value={formData.totalCost || ''}
                  onChange={handleChange('totalCost')}
                  disabled={loading || isSubmitting}
                  placeholder="0"
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }
                  }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Garantía y Almacenamiento */}
        <Card variant="outlined">
          <CardHeader
            avatar={<Icon icon="eva:shield-outline" width={20} />}
            title="Garantía y Almacenamiento"
            slotProps={{ 
              title: { variant: 'subtitle1', fontWeight: 600 } 
            }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Define los períodos de garantía y almacenamiento para esta reparación
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Garantía (meses)"
                  type="number"
                  value={formData.warrantyPeriodMonths || 3}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 3;
                    setFormData(prev => ({ 
                      ...prev, 
                      warrantyPeriodMonths: Math.min(Math.max(value, 1), 60)
                    }));
                  }}
                  disabled={loading || isSubmitting}
                  helperText="Período de garantía en meses (1-60)"
                  inputProps={{ min: 1, max: 60 }}
                  InputProps={{
                    startAdornment: <Icon icon="eva:shield-outline" width={20} style={{ marginRight: 8 }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Almacenamiento (meses)"
                  type="number"
                  value={formData.storagePeriodMonths || 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setFormData(prev => ({ 
                      ...prev, 
                      storagePeriodMonths: Math.min(Math.max(value, 1), 24)
                    }));
                  }}
                  disabled={loading || isSubmitting}
                  helperText="Período de almacenamiento en meses (1-24)"
                  inputProps={{ min: 1, max: 24 }}
                  InputProps={{
                    startAdornment: <Icon icon="eva:archive-outline" width={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Box>
              
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Garantía:</strong> Tiempo durante el cual el cliente puede reclamar por fallas en la reparación.<br/>
                  <strong>Almacenamiento:</strong> Tiempo máximo que el producto reparado permanecerá en el taller sin ser recogido.
                </Typography>
              </Alert>
            </Stack>
          </CardContent>
        </Card>

        {/* Imágenes del Dispositivo */}
        <Card variant="outlined">
          <CardHeader
            avatar={<Icon icon="eva:image-outline" width={20} />}
            title="Imágenes del Dispositivo"
            slotProps={{ 
              title: { variant: 'subtitle1', fontWeight: 600 } 
            }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sube fotografías del dispositivo para documentar su estado
            </Typography>
            <ImageUpload
              onImagesChange={setImages}
              maxImages={8}
              maxSizeInMB={10}
              container="repair-images"
              folder={order?.id ? `order-${order.id}` : `temp-${Date.now()}`}
              initialImages={images}
            />
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            onClick={onCancel}
            disabled={loading || isSubmitting}
          >
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading || isSubmitting}
            startIcon={<Icon icon={order ? "eva:save-outline" : "eva:plus-outline"} />}
          >
            {order ? 'Actualizar' : 'Crear'} Orden
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}