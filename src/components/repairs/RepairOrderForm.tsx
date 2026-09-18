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
  Snackbar,
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
import { useAuthStore } from '@/store/auth.store';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageMetadata } from '@/types';

interface RepairOrderFormProps {
  order?: RepairOrder | null;
  onSave: (order: RepairOrder) => void;
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

const validationFieldLabels: Record<string, string> = {
  clientName: 'Nombre completo',
  clientPhone: 'Teléfono',
  deviceType: 'Tipo de dispositivo',
  deviceBrand: 'Marca',
  deviceDescription: 'Descripción del dispositivo',
  problemDescription: 'Descripción del problema',
  initialDiagnosis: 'Diagnóstico inicial',
};

export default function RepairOrderForm({ 
  order, 
  onSave, 
  onCancel, 
  loading = false 
}: RepairOrderFormProps) {
  const { createOrder, updateOrder, clearError } = useRepairOrders();
  const { activeBranchId } = useAuthStore();
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
    branchId: order?.branchId || activeBranchId || undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [validationToastOpen, setValidationToastOpen] = useState(false);
  const [warrantyMonthsInput, setWarrantyMonthsInput] = useState(String(order?.warrantyPeriodMonths ?? 3));
  const [storageMonthsInput, setStorageMonthsInput] = useState(String(order?.storagePeriodMonths ?? 1));

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

  useEffect(() => {
    setWarrantyMonthsInput(String(order?.warrantyPeriodMonths ?? 3));
    setStorageMonthsInput(String(order?.storagePeriodMonths ?? 1));
  }, [order?.id, order?.warrantyPeriodMonths, order?.storagePeriodMonths]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName?.trim()) {
      newErrors.clientName = 'El nombre del cliente es obligatorio';
    }

    if (!formData.clientPhone?.trim()) {
      newErrors.clientPhone = 'El teléfono es obligatorio';
    } else if (formData.clientPhone.length < 10) {
      newErrors.clientPhone = 'El teléfono debe tener al menos 10 dígitos';
    }

    if (!formData.deviceType) {
      newErrors.deviceType = 'El tipo de dispositivo es obligatorio';
    }

    if (!formData.deviceBrand?.trim()) {
      newErrors.deviceBrand = 'La marca es obligatoria';
    }

    if (!formData.deviceDescription?.trim()) {
      newErrors.deviceDescription = 'La descripción del dispositivo es obligatoria';
    } else if (formData.deviceDescription.length < 10) {
      newErrors.deviceDescription = 'La descripción debe tener al menos 10 caracteres';
    }

    if (!formData.problemDescription?.trim()) {
      newErrors.problemDescription = 'La descripción del problema es obligatoria';
    } else if (formData.problemDescription.length < 10) {
      newErrors.problemDescription = 'La descripción del problema debe tener al menos 10 caracteres';
    }

    if (!formData.initialDiagnosis?.trim()) {
      newErrors.initialDiagnosis = 'El diagnóstico inicial es obligatorio';
    }

    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      const firstError = Object.keys(newErrors)[0];
      setSubmitError('');
      setValidationToastOpen(true);

      window.setTimeout(() => {
        const field = document.querySelector<HTMLElement>(`[data-validation-field="${firstError}"]`);
        const summary = document.querySelector<HTMLElement>('[data-validation-summary]');
        summary?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = field?.querySelector<HTMLElement>('input, textarea, [role="combobox"]');
        input?.focus({ preventScroll: true });
      }, 0);
    }
    
    return isValid;
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

  const validationErrors = Object.entries(errors).filter(([, message]) => Boolean(message));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const allImageUrls = images.map(image => image.url);
      
      const orderData = {
        ...formData,
        images: allImageUrls
      };

      const savedOrder = order
        ? await updateOrder(order.id, orderData)
        : await createOrder({
            ...orderData,
            // El folio lo genera el servidor; la URL se completa después de recibirlo.
            // Se conserva en la orden para que futuras reimpresiones usen el mismo host.
            trackingUrl: undefined,
          });

      if (!order && savedOrder?.folio && typeof window !== 'undefined') {
        const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(savedOrder.folio)}`;
        try {
          // La migración de tracking_url puede aplicarse después del despliegue.
          // La orden ya está creada, por lo que no debemos bloquear el flujo si aún no existe.
          const persistedOrder = await updateOrder(savedOrder.id, { trackingUrl });
          onSave(persistedOrder);
        } catch (trackingError) {
          console.warn('No se pudo guardar la URL de seguimiento; se usará la URL actual al reimprimir.', trackingError);
          clearError();
          onSave({ ...savedOrder, trackingUrl });
        }
      } else {
        onSave(savedOrder);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error al guardar la orden';
      console.error('Error saving repair order:', error);
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        {/* Error de envío */}
        {submitError && (
          <Alert severity="error" onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}
        {validationErrors.length > 0 && (
          <Alert
            data-validation-summary
            severity="warning"
            icon={<Icon icon="eva:alert-triangle-outline" />}
            sx={{ alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%', minWidth: 0 } }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Revisa la información antes de continuar
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Hay {validationErrors.length} {validationErrors.length === 1 ? 'campo pendiente' : 'campos pendientes'}.
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {validationErrors.map(([field, message]) => (
                <Box component="li" key={field}>
                  <Button
                    type="button"
                    size="small"
                    color="inherit"
                    onClick={() => {
                      const target = document.querySelector<HTMLElement>(`[data-validation-field="${field}"]`);
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      target?.querySelector<HTMLElement>('input, textarea, [role="combobox"]')?.focus();
                    }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      p: 0,
                      mb: 0.75,
                      minWidth: 0,
                      textTransform: 'none',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      fontWeight: 600,
                      lineHeight: 1.45,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {validationFieldLabels[field] || field}: {message}
                  </Button>
                </Box>
              ))}
            </Box>
          </Alert>
        )}
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
                  data-validation-field="clientName"
                  fullWidth
                  label="Nombre Completo *"
                  value={formData.clientName}
                  onChange={handleChange('clientName')}
                  error={!!errors.clientName}
                  helperText={errors.clientName}
                  disabled={loading || isSubmitting}
                />
                <TextField
                  data-validation-field="clientPhone"
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
                <FormControl data-validation-field="deviceType" fullWidth error={!!errors.deviceType} size="medium">
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
                <FormControl data-validation-field="deviceBrand" fullWidth error={!!errors.deviceBrand} size="medium">
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
                data-validation-field="deviceDescription"
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
                data-validation-field="problemDescription"
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
                data-validation-field="initialDiagnosis"
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
                  value={warrantyMonthsInput}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setWarrantyMonthsInput(rawValue);
                    setFormData(prev => ({
                      ...prev,
                      warrantyPeriodMonths: rawValue ? Math.min(Number(rawValue), 60) : undefined,
                    }));
                  }}
                  onBlur={() => {
                    const value = Math.min(Math.max(Number(warrantyMonthsInput) || 3, 1), 60);
                    setWarrantyMonthsInput(String(value));
                    setFormData(prev => ({ ...prev, warrantyPeriodMonths: value }));
                  }}
                  disabled={loading || isSubmitting}
                  helperText="1-60 meses · inicia al entregar el aparato"
                  inputProps={{ min: 1, max: 60 }}
                  InputProps={{
                    startAdornment: <Icon icon="eva:shield-outline" width={20} style={{ marginRight: 8 }} />
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Almacenamiento (meses)"
                  type="number"
                  value={storageMonthsInput}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setStorageMonthsInput(rawValue);
                    setFormData(prev => ({
                      ...prev,
                      storagePeriodMonths: rawValue ? Math.min(Number(rawValue), 24) : undefined,
                    }));
                  }}
                  onBlur={() => {
                    const value = Math.min(Math.max(Number(storageMonthsInput) || 1, 1), 24);
                    setStorageMonthsInput(String(value));
                    setFormData(prev => ({ ...prev, storagePeriodMonths: value }));
                  }}
                  disabled={loading || isSubmitting}
                  helperText="1-24 meses · inicia al quedar listo para recoger"
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
        <Box sx={{
          display: 'flex',
          gap: { xs: 1.25, sm: 2 },
          justifyContent: 'flex-end',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          pt: { xs: 1.5, sm: 1 },
          pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', sm: 1 },
          mb: { xs: 1, sm: 0 },
          '& .MuiButtonBase-root': {
            minHeight: { xs: 48, sm: 40 },
            width: { xs: '100%', sm: 'auto' },
          },
        }}>
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
      <Snackbar
        open={validationToastOpen}
        autoHideDuration={6000}
        onClose={() => setValidationToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setValidationToastOpen(false)}
          icon={<Icon icon="eva:alert-triangle-outline" />}
          sx={{ width: '100%' }}
        >
          No se puede guardar: completa los {validationErrors.length} {validationErrors.length === 1 ? 'dato obligatorio' : 'datos obligatorios'}.
        </Alert>
      </Snackbar>
    </Box>
  );
}
