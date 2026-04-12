import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Icon } from '@iconify/react';

export interface DigitalSignatureData {
  id: string;
  signatureDataURL: string;
  signerName: string;
  signerRole: 'client' | 'technician' | 'supervisor';
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
  metadata: {
    width: number;
    height: number;
    strokeCount: number;
    duration: number;
  };
}

interface DigitalSignatureProps {
  onSignature: (signature: DigitalSignatureData) => void;
  signerName?: string;
  signerRole?: 'client' | 'technician' | 'supervisor';
  required?: boolean;
  disabled?: boolean;
  existingSignature?: DigitalSignatureData;
  width?: number;
  height?: number;
}

export default function DigitalSignature({
  onSignature,
  signerName = '',
  signerRole = 'client',
  required = false,
  disabled = false,
  existingSignature,
  width = 400,
  height = 200
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number; type: 'start' | 'draw' | 'end' }>>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [signerInfoOpen, setSignerInfoOpen] = useState(false);
  const [currentSignerName, setCurrentSignerName] = useState(signerName);
  const [currentSignerRole, setCurrentSignerRole] = useState(signerRole);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Cargar firma existente si la hay
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = existingSignature.signatureDataURL;
    } else {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar línea de firma
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(50, height - 30);
      ctx.lineTo(width - 50, height - 30);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Texto de instrucción
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Firme aquí', width / 2, height - 10);
      
      // Restaurar configuración para firma
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
    }
  }, [existingSignature, width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    setIsDrawing(true);
    if (!startTime) {
      setStartTime(Date.now());
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    setStrokes(prev => [...prev, { x, y, type: 'start' }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    setStrokes(prev => [...prev, { x, y, type: 'draw' }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setStrokes(prev => [...prev, { x: 0, y: 0, type: 'end' }]);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redibujar línea de firma
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(50, height - 30);
    ctx.lineTo(width - 50, height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Texto de instrucción
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Firme aquí', width / 2, height - 10);
    
    // Restaurar configuración
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;

    setIsEmpty(true);
    setStrokes([]);
    setStartTime(null);
    setError(null);
  };

  const saveSignature = async () => {
    if (isEmpty) {
      setError('La firma es requerida');
      return;
    }

    if (!currentSignerName.trim()) {
      setError('El nombre del firmante es requerido');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Generar datos de la firma
      const signatureDataURL = canvas.toDataURL('image/png');
      const duration = startTime ? Date.now() - startTime : 0;

      // Obtener información del dispositivo y IP (simplificado)
      const deviceInfo = `${navigator.userAgent.substring(0, 100)}...`;
      
      const signatureData: DigitalSignatureData = {
        id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        signatureDataURL,
        signerName: currentSignerName.trim(),
        signerRole: currentSignerRole,
        timestamp: new Date(),
        deviceInfo,
        metadata: {
          width: canvas.width,
          height: canvas.height,
          strokeCount: strokes.filter(s => s.type === 'start').length,
          duration
        }
      };

      onSignature(signatureData);
      setError(null);
      
    } catch (error) {
      setError('Error al guardar la firma');
      console.error('Error saving signature:', error);
    }
  };

  const openSignerInfo = () => {
    setSignerInfoOpen(true);
    setCurrentSignerName(signerName);
    setCurrentSignerRole(signerRole);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Cliente';
      case 'technician': return 'Técnico';
      case 'supervisor': return 'Supervisor';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'client': return 'primary';
      case 'technician': return 'info';
      case 'supervisor': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:edit-outline" width={20} />
            Firma Digital
            {required && <span style={{ color: 'red' }}>*</span>}
          </Typography>
          
          {existingSignature && (
            <Chip
              label={`Firmado por ${existingSignature.signerName}`}
              color={getRoleColor(existingSignature.signerRole) as any}
              size="small"
              icon={<Icon icon="eva:checkmark-circle-outline" width={16} />}
            />
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Canvas de firma */}
        <Box 
          sx={{ 
            border: '2px dashed #e5e7eb',
            borderRadius: 1,
            p: 1,
            mb: 2,
            backgroundColor: disabled ? '#f9fafb' : 'white',
            cursor: disabled ? 'not-allowed' : 'crosshair'
          }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ 
              display: 'block',
              touchAction: 'none',
              filter: disabled ? 'grayscale(1) opacity(0.5)' : 'none'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </Box>

        {/* Información del firmante */}
        {(currentSignerName || existingSignature) && (
          <Box sx={{ mb: 2, p: 1, backgroundColor: '#f8fafc', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Firmante: <strong>{existingSignature?.signerName || currentSignerName}</strong> • 
              Rol: <strong>{getRoleLabel(existingSignature?.signerRole || currentSignerRole)}</strong>
              {existingSignature && (
                <> • Fecha: <strong>{existingSignature.timestamp.toLocaleString('es-MX')}</strong></>
              )}
            </Typography>
          </Box>
        )}

        {/* Controles */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!existingSignature && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Icon icon="eva:person-outline" />}
                onClick={openSignerInfo}
                disabled={disabled}
              >
                {currentSignerName ? 'Cambiar Firmante' : 'Info Firmante'}
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<Icon icon="eva:trash-2-outline" />}
                onClick={clearSignature}
                disabled={disabled || isEmpty}
              >
                Limpiar
              </Button>

              <LoadingButton
                variant="contained"
                size="small"
                startIcon={<Icon icon="eva:save-outline" />}
                onClick={saveSignature}
                disabled={disabled || isEmpty || !currentSignerName.trim()}
              >
                Guardar Firma
              </LoadingButton>
            </>
          )}

          {existingSignature && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:download-outline" />}
              onClick={() => {
                const link = document.createElement('a');
                link.download = `firma_${existingSignature.signerName}_${existingSignature.id}.png`;
                link.href = existingSignature.signatureDataURL;
                link.click();
              }}
            >
              Descargar
            </Button>
          )}
        </Box>
      </Paper>

      {/* Dialog información del firmante */}
      <Dialog open={signerInfoOpen} onClose={() => setSignerInfoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Información del Firmante</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre completo"
              value={currentSignerName}
              onChange={(e) => setCurrentSignerName(e.target.value)}
              fullWidth
              required
              helperText="Nombre de la persona que firmará el documento"
            />

            <FormControl fullWidth>
              <InputLabel>Rol del firmante</InputLabel>
              <Select
                value={currentSignerRole}
                onChange={(e) => setCurrentSignerRole(e.target.value as any)}
                label="Rol del firmante"
              >
                <MenuItem value="client">Cliente</MenuItem>
                <MenuItem value="technician">Técnico</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              La firma digital incluirá información de timestamp, dispositivo y metadatos para garantizar su autenticidad.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignerInfoOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => setSignerInfoOpen(false)}
            disabled={!currentSignerName.trim()}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}