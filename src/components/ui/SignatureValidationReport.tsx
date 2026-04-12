import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DigitalSignature } from '@/types/repair';

interface SignatureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    signatureAge: number;
    deviceFingerprint: string;
    trustLevel: 'high' | 'medium' | 'low';
  };
}

interface SignatureValidationReportProps {
  signatures: DigitalSignature[];
  onValidate?: (signature: DigitalSignature) => void;
  showDetailedReport?: boolean;
}

export default function SignatureValidationReport({
  signatures,
  onValidate,
  showDetailedReport = false
}: SignatureValidationReportProps) {
  const [validationResults, setValidationResults] = useState<Map<string, SignatureValidation>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<DigitalSignature | null>(null);

  useEffect(() => {
    if (signatures.length > 0) {
      validateAllSignatures();
    }
  }, [signatures]);

  const validateAllSignatures = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = new Map<string, SignatureValidation>();

      for (const signature of signatures) {
        const response = await fetch('/api/digital-signatures/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature })
        });

        const result = await response.json();

        if (result.success) {
          results.set(signature.id, result.data);
        } else {
          console.error(`Error validating signature ${signature.id}:`, result.error);
        }
      }

      setValidationResults(results);
    } catch (error) {
      setError('Error validando firmas');
      console.error('Error validating signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrustLevelIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'eva:shield-outline';
      case 'medium': return 'eva:alert-triangle-outline';
      case 'low': return 'eva:alert-circle-outline';
      default: return 'eva:question-mark-outline';
    }
  };

  const getTrustLevelColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'client': return 'eva:person-outline';
      case 'technician': return 'eva:settings-outline';
      case 'supervisor': return 'eva:star-outline';
      default: return 'eva:person-outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Cliente';
      case 'technician': return 'Técnico';
      case 'supervisor': return 'Supervisor';
      default: return role;
    }
  };

  const showSignatureDetails = (signature: DigitalSignature) => {
    setSelectedSignature(signature);
    setDetailDialogOpen(true);
  };

  const calculateOverallTrust = () => {
    if (validationResults.size === 0) return 'unknown';
    
    const trustLevels = Array.from(validationResults.values()).map(v => v.metadata.trustLevel);
    const highCount = trustLevels.filter(l => l === 'high').length;
    const mediumCount = trustLevels.filter(l => l === 'medium').length;
    const lowCount = trustLevels.filter(l => l === 'low').length;
    
    if (lowCount > 0) return 'low';
    if (mediumCount > highCount) return 'medium';
    return 'high';
  };

  const overallTrust = calculateOverallTrust();
  const validSignatures = Array.from(validationResults.values()).filter(v => v.isValid).length;
  const totalSignatures = signatures.length;

  if (signatures.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Icon 
            icon="eva:file-text-outline" 
            width={48} 
            height={48} 
            color="text.secondary"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="body2" color="text.secondary">
            No hay firmas para validar
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          avatar={<Icon icon="eva:shield-check-outline" width={24} />}
          title="Validación de Firmas Digitales"
          subheader={`${totalSignatures} firmas analizadas`}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:refresh-outline" />}
              onClick={validateAllSignatures}
              disabled={loading}
            >
              Revalidar
            </Button>
          }
        />

        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Resumen general */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Icon 
                    icon={getTrustLevelIcon(overallTrust as any)} 
                    width={32} 
                    color={`${getTrustLevelColor(overallTrust as any)}.main`}
                  />
                  <Typography variant="h6" color={`${getTrustLevelColor(overallTrust as any)}.main`}>
                    Confianza {overallTrust === 'high' ? 'Alta' : overallTrust === 'medium' ? 'Media' : 'Baja'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {validSignatures}/{totalSignatures}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Firmas Válidas
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary.main">
                    {Array.from(validationResults.values()).reduce((acc, v) => acc + v.warnings.length, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advertencias
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Lista de firmas */}
          <List>
            {signatures.map((signature, index) => {
              const validation = validationResults.get(signature.id);
              
              return (
                <ListItem 
                  key={signature.id}
                  sx={{ 
                    border: '1px solid',
                    borderColor: validation?.isValid ? 'success.light' : 'error.light',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: validation?.isValid ? 'success.lighter' : 'error.lighter'
                  }}
                >
                  <ListItemIcon>
                    <Icon 
                      icon={getRoleIcon(signature.signerRole)} 
                      width={24} 
                      color={validation?.isValid ? 'success.main' : 'error.main'} 
                    />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {signature.signerName}
                        </Typography>
                        <Chip 
                          label={getRoleLabel(signature.signerRole)} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                        {validation && (
                          <Chip 
                            label={validation.metadata.trustLevel === 'high' ? 'Alta confianza' : 
                                   validation.metadata.trustLevel === 'medium' ? 'Media confianza' : 'Baja confianza'} 
                            size="small" 
                            color={getTrustLevelColor(validation.metadata.trustLevel) as any}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Firmado: {format(new Date(signature.timestamp), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </Typography>
                        {validation && (
                          <Box sx={{ mt: 0.5 }}>
                            {validation.errors.length > 0 && (
                              <Typography variant="caption" color="error">
                                • {validation.errors.join(', ')}
                              </Typography>
                            )}
                            {validation.warnings.length > 0 && (
                              <Typography variant="caption" color="warning.main">
                                • {validation.warnings.join(', ')}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => showSignatureDetails(signature)}
                    startIcon={<Icon icon="eva:eye-outline" />}
                  >
                    Detalles
                  </Button>
                </ListItem>
              );
            })}
          </List>

          {/* Reporte detallado */}
          {showDetailedReport && validationResults.size > 0 && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:bar-chart-outline" width={20} />
                  Reporte Técnico Detallado
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Firmante</TableCell>
                        <TableCell>Dispositivo</TableCell>
                        <TableCell>Edad (días)</TableCell>
                        <TableCell>Trazos</TableCell>
                        <TableCell>Duración</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {signatures.map((signature) => {
                        const validation = validationResults.get(signature.id);
                        return (
                          <TableRow key={signature.id}>
                            <TableCell>{signature.signerName}</TableCell>
                            <TableCell>
                              <Typography variant="caption" noWrap>
                                {signature.deviceInfo?.substring(0, 30)}...
                              </Typography>
                            </TableCell>
                            <TableCell>{validation?.metadata.signatureAge || 0}</TableCell>
                            <TableCell>{signature.metadata.strokeCount}</TableCell>
                            <TableCell>{(signature.metadata.duration / 1000).toFixed(1)}s</TableCell>
                            <TableCell>
                              <Chip
                                label={validation?.isValid ? 'Válida' : 'Inválida'}
                                size="small"
                                color={validation?.isValid ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalles de firma */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles de Firma Digital
        </DialogTitle>
        <DialogContent>
          {selectedSignature && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Información del Firmante
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Nombre" 
                        secondary={selectedSignature.signerName} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Rol" 
                        secondary={getRoleLabel(selectedSignature.signerRole)} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Timestamp" 
                        secondary={format(new Date(selectedSignature.timestamp), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })} 
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Metadatos Técnicos
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="ID de Firma" 
                        secondary={selectedSignature.id} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Dimensiones" 
                        secondary={`${selectedSignature.metadata.width}x${selectedSignature.metadata.height}px`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Trazos" 
                        secondary={selectedSignature.metadata.strokeCount} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Duración" 
                        secondary={`${(selectedSignature.metadata.duration / 1000).toFixed(1)} segundos`} 
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Imagen de la Firma
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, display: 'inline-block' }}>
                  <img 
                    src={selectedSignature.signatureDataURL} 
                    alt="Firma digital"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px',
                      border: '1px solid #e0e0e0'
                    }}
                  />
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}