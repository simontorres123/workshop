import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Fade,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WarrantyClaim, DigitalSignature } from '@/types/repair';
import DigitalSignatureComponent from '@/components/ui/DigitalSignature';

interface WarrantyClaimHistoryProps {
  claims: WarrantyClaim[];
  onAddClaim?: (claim: Omit<WarrantyClaim, 'id' | 'date'>) => void;
  readonly?: boolean;
  loading?: boolean;
}

export default function WarrantyClaimHistory({ 
  claims = [], 
  onAddClaim,
  readonly = false,
  loading = false 
}: WarrantyClaimHistoryProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [newClaim, setNewClaim] = useState({
    reason: '',
    technician: '',
    notes: '',
    resolution: '',
    status: 'pending' as 'pending' | 'in_review' | 'resolved' | 'rejected'
  });
  const [clientSignature, setClientSignature] = useState<DigitalSignature | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<DigitalSignature | null>(null);
  const [supervisorSignature, setSupervisorSignature] = useState<DigitalSignature | null>(null);

  const handleSubmit = () => {
    if (newClaim.reason.trim() && newClaim.technician.trim() && onAddClaim) {
      onAddClaim({
        reason: newClaim.reason.trim(),
        technician: newClaim.technician.trim(),
        notes: newClaim.notes.trim() || undefined,
        resolution: newClaim.resolution.trim() || undefined,
        status: newClaim.status,
        clientSignature: clientSignature || undefined,
        technicianSignature: technicianSignature || undefined,
        supervisorSignature: supervisorSignature || undefined
      });
      
      // Reset form
      setNewClaim({ 
        reason: '', 
        technician: '', 
        notes: '', 
        resolution: '', 
        status: 'pending' 
      });
      setClientSignature(null);
      setTechnicianSignature(null);
      setSupervisorSignature(null);
      setActiveTab(0);
      setOpenDialog(false);
    }
  };

  const resetForm = () => {
    setNewClaim({ 
      reason: '', 
      technician: '', 
      notes: '', 
      resolution: '', 
      status: 'pending' 
    });
    setClientSignature(null);
    setTechnicianSignature(null);
    setSupervisorSignature(null);
    setActiveTab(0);
  };

  const sortedClaims = [...claims].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (claims.length === 0 && readonly) {
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Icon 
            icon="eva:shield-outline" 
            width={48} 
            height={48} 
            color="text.secondary"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="body2" color="text.secondary">
            No hay reclamos de garantía registrados
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="eva:shield-outline" width={24} height={24} />
          <Typography variant="h6" fontWeight="bold">
            Historial de Garantías
          </Typography>
          <Chip 
            label={claims.length} 
            size="small" 
            color={claims.length > 0 ? 'warning' : 'default'}
          />
        </Box>
        
        {!readonly && onAddClaim && (
          <Tooltip title="Registrar nuevo reclamo de garantía">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon icon="eva:plus-outline" />}
              onClick={() => setOpenDialog(true)}
              disabled={loading}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none'
              }}
            >
              Nuevo Reclamo
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Timeline de reclamos */}
      {sortedClaims.length > 0 ? (
        <Timeline sx={{ p: 0 }}>
          {sortedClaims.map((claim, index) => (
            <Fade in key={claim.id} timeout={300 + index * 100}>
              <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot 
                    color="warning" 
                    sx={{ 
                      bgcolor: 'warning.main',
                      border: '3px solid',
                      borderColor: 'warning.lighter'
                    }}
                  >
                    <Icon icon="eva:alert-triangle-outline" width={16} />
                  </TimelineDot>
                  {index < sortedClaims.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                
                <TimelineContent sx={{ pb: 3 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'warning.light',
                      bgcolor: 'warning.lighter',
                      '&:hover': {
                        boxShadow: 2
                      }
                    }}
                  >
                    <CardContent sx={{ pb: '16px !important' }}>
                      {/* Header del reclamo */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1
                      }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                          {claim.reason}
                        </Typography>
                        <Chip 
                          label={format(new Date(claim.date), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      </Box>
                      
                      {/* Técnico */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Icon icon="eva:person-outline" width={16} color="text.secondary" />
                        <Typography variant="body2" color="text.secondary">
                          Atendido por: <strong>{claim.technician}</strong>
                        </Typography>
                      </Box>
                      
                      {/* Estado */}
                      {claim.status && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Icon icon="eva:info-outline" width={16} color="text.secondary" />
                          <Typography variant="body2" color="text.secondary">
                            Estado:
                          </Typography>
                          <Chip 
                            label={getStatusLabel(claim.status)} 
                            size="small" 
                            color={getStatusColor(claim.status)} 
                            variant="outlined"
                          />
                        </Box>
                      )}

                      {/* Notas */}
                      {claim.notes && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Notas:</strong> {claim.notes}
                          </Typography>
                        </>
                      )}

                      {/* Resolución */}
                      {claim.resolution && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Resolución:</strong> {claim.resolution}
                          </Typography>
                        </>
                      )}

                      {/* Firmas Digitales */}
                      {(claim.clientSignature || claim.technicianSignature || claim.supervisorSignature) && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            <strong>Firmas:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {claim.clientSignature && (
                              <Chip
                                icon={<Icon icon="eva:checkmark-circle-outline" width={16} />}
                                label={`Cliente: ${claim.clientSignature.signerName}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {claim.technicianSignature && (
                              <Chip
                                icon={<Icon icon="eva:checkmark-circle-outline" width={16} />}
                                label={`Técnico: ${claim.technicianSignature.signerName}`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                            {claim.supervisorSignature && (
                              <Chip
                                icon={<Icon icon="eva:checkmark-circle-outline" width={16} />}
                                label={`Supervisor: ${claim.supervisorSignature.signerName}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TimelineContent>
              </TimelineItem>
            </Fade>
          ))}
        </Timeline>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Icon 
              icon="eva:shield-outline" 
              width={48} 
              height={48} 
              color="text.secondary"
              style={{ marginBottom: 16 }}
            />
            <Typography variant="body2" color="text.secondary">
              No hay reclamos de garantía registrados
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Dialog para agregar nuevo reclamo */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          bgcolor: 'warning.lighter',
          color: 'warning.dark'
        }}>
          <Icon icon="eva:shield-outline" width={24} />
          Registrar Reclamo de Garantía
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Información Básica" icon={<Icon icon="eva:file-text-outline" width={16} />} />
            <Tab label="Firmas Digitales" icon={<Icon icon="eva:edit-outline" width={16} />} />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              <TextField
                autoFocus
                fullWidth
                label="Motivo del reclamo"
                value={newClaim.reason}
                onChange={(e) => setNewClaim(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ej: Falla en el compresor"
                sx={{ mb: 2 }}
                required
              />
              
              <TextField
                fullWidth
                label="Técnico que atiende"
                value={newClaim.technician}
                onChange={(e) => setNewClaim(prev => ({ ...prev, technician: e.target.value }))}
                placeholder="Ej: Luis Pérez"
                sx={{ mb: 2 }}
                required
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Estado del reclamo</InputLabel>
                <Select
                  value={newClaim.status}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, status: e.target.value as any }))}
                  label="Estado del reclamo"
                >
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="in_review">En Revisión</MenuItem>
                  <MenuItem value="resolved">Resuelto</MenuItem>
                  <MenuItem value="rejected">Rechazado</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Notas adicionales"
                value={newClaim.notes}
                onChange={(e) => setNewClaim(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Información adicional sobre el reclamo..."
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Resolución"
                value={newClaim.resolution}
                onChange={(e) => setNewClaim(prev => ({ ...prev, resolution: e.target.value }))}
                placeholder="Descripción de cómo se resolvió el reclamo..."
                multiline
                rows={3}
              />
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Las firmas digitales proporcionan autenticidad legal al reclamo de garantía.
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Firma del Cliente
                  </Typography>
                  <DigitalSignatureComponent
                    onSignature={setClientSignature}
                    signerRole="client"
                    existingSignature={clientSignature}
                    width={350}
                    height={150}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Firma del Técnico
                  </Typography>
                  <DigitalSignatureComponent
                    onSignature={setTechnicianSignature}
                    signerRole="technician"
                    existingSignature={technicianSignature}
                    width={350}
                    height={150}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Firma del Supervisor (Opcional)
                  </Typography>
                  <DigitalSignatureComponent
                    onSignature={setSupervisorSignature}
                    signerRole="supervisor"
                    existingSignature={supervisorSignature}
                    width={350}
                    height={150}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => {
            setOpenDialog(false);
            resetForm();
          }}>
            Cancelar
          </Button>
          <Button 
            variant="outlined"
            onClick={resetForm}
            startIcon={<Icon icon="eva:refresh-outline" />}
          >
            Limpiar
          </Button>
          <Button 
            variant="contained"
            color="warning"
            onClick={handleSubmit}
            disabled={!newClaim.reason.trim() || !newClaim.technician.trim() || loading}
            startIcon={loading ? <Icon icon="eva:loader-outline" /> : <Icon icon="eva:save-outline" />}
          >
            {loading ? 'Guardando...' : 'Registrar Reclamo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Funciones auxiliares para el estado
  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_review': return 'En Revisión';
      case 'resolved': return 'Resuelto';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  }

  function getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_review': return 'info';
      case 'resolved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  }
}