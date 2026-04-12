import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Slider,
  Stack,
  Divider,
  Alert,
  InputAdornment,
  Autocomplete,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Icon } from '@iconify/react';
import { RepairStatus } from '@/types/repair';

export interface AdvancedFilterState {
  // Filtros de fecha
  dateRange: {
    from?: Date;
    to?: Date;
  };
  
  // Filtros de cliente
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  hasEmail?: boolean;
  
  // Filtros de dispositivo
  deviceTypes: string[];
  deviceBrands: string[];
  
  // Filtros de estado
  statuses: RepairStatus[];
  excludeDelivered?: boolean;
  
  // Filtros de técnico/empleado
  technician?: string;
  createdBy?: string;
  
  // Filtros de costo
  costRange: {
    min?: number;
    max?: number;
  };
  
  // Filtros de tiempo
  daysInStorage?: {
    min?: number;
    max?: number;
  };
  
  // Filtros de garantía
  warrantyStatus?: 'active' | 'expired' | 'expiring' | 'none';
  hasWarrantyClaims?: boolean;
  
  // Filtros de urgencia
  urgentOnly?: boolean;
  criticalOnly?: boolean;
  
  // Ordenamiento
  sortBy?: 'createdAt' | 'folio' | 'clientName' | 'totalCost' | 'completedAt' | 'daysInStorage';
  sortOrder?: 'asc' | 'desc';
  
  // Paginación
  limit?: number;
  offset?: number;
}

interface AdvancedFiltersProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilterState) => void;
  initialFilters?: Partial<AdvancedFilterState>;
  availableOptions?: {
    deviceTypes: string[];
    deviceBrands: string[];
    technicians: string[];
    clients: string[];
  };
}

export default function AdvancedFilters({ 
  open, 
  onClose, 
  onApply, 
  initialFilters = {},
  availableOptions = {
    deviceTypes: ['Lavadora', 'Refrigerador', 'Microondas', 'Estufa', 'Lavavajillas', 'Horno'],
    deviceBrands: ['Samsung', 'LG', 'Whirlpool', 'Mabe', 'Panasonic', 'GE'],
    technicians: ['José García', 'María López', 'Carlos Rodríguez', 'Ana Morales'],
    clients: []
  }
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<AdvancedFilterState>({
    dateRange: {},
    deviceTypes: [],
    deviceBrands: [],
    statuses: [],
    costRange: {},
    daysInStorage: {},
    ...initialFilters
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [expanded, setExpanded] = useState<string[]>(['basic']);

  useEffect(() => {
    // Contar filtros activos
    let count = 0;
    
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.clientName) count++;
    if (filters.clientPhone) count++;
    if (filters.deviceTypes.length > 0) count++;
    if (filters.deviceBrands.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.technician) count++;
    if (filters.costRange.min || filters.costRange.max) count++;
    if (filters.daysInStorage?.min || filters.daysInStorage?.max) count++;
    if (filters.warrantyStatus) count++;
    if (filters.urgentOnly || filters.criticalOnly) count++;
    
    setActiveFiltersCount(count);
  }, [filters]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFilterChange = (parent: string, field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof AdvancedFilterState],
        [field]: value
      }
    }));
  };

  const handleArrayFilterChange = (field: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentArray = prev[field as keyof AdvancedFilterState] as string[] || [];
      
      if (checked) {
        return {
          ...prev,
          [field]: [...currentArray, value]
        };
      } else {
        return {
          ...prev,
          [field]: currentArray.filter(item => item !== value)
        };
      }
    });
  };

  const handleReset = () => {
    setFilters({
      dateRange: {},
      deviceTypes: [],
      deviceBrands: [],
      statuses: [],
      costRange: {},
      daysInStorage: {}
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const toggleAccordion = (panel: string) => {
    setExpanded(prev => 
      prev.includes(panel) 
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    );
  };

  const getStatusColor = (status: RepairStatus) => {
    const colors = {
      [RepairStatus.PENDING_DIAGNOSIS]: 'warning',
      [RepairStatus.DIAGNOSIS_CONFIRMED]: 'info',
      [RepairStatus.REPAIR_ACCEPTED]: 'success',
      [RepairStatus.REPAIR_REJECTED]: 'error',
      [RepairStatus.IN_REPAIR]: 'primary',
      [RepairStatus.REPAIRED]: 'success',
      [RepairStatus.DELIVERED]: 'success'
    };
    return colors[status] || 'default';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:funnel-outline" width={24} />
            <Box>
              <Typography variant="h6">Filtros Avanzados</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeFiltersCount} filtros activos
              </Typography>
            </Box>
          </Box>
          
          {activeFiltersCount > 0 && (
            <Button
              size="small"
              color="warning"
              startIcon={<Icon icon="eva:trash-2-outline" />}
              onClick={handleReset}
            >
              Limpiar Todo
            </Button>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Resumen de filtros activos */}
        {activeFiltersCount > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.lighter' }}>
            <Typography variant="subtitle2" gutterBottom>
              Filtros Activos ({activeFiltersCount})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {filters.dateRange.from && (
                <Chip
                  label={`Desde: ${filters.dateRange.from.toLocaleDateString()}`}
                  size="small"
                  onDelete={() => handleNestedFilterChange('dateRange', 'from', undefined)}
                />
              )}
              {filters.clientName && (
                <Chip
                  label={`Cliente: ${filters.clientName}`}
                  size="small"
                  onDelete={() => handleFilterChange('clientName', '')}
                />
              )}
              {filters.deviceTypes.map(type => (
                <Chip
                  key={type}
                  label={`Dispositivo: ${type}`}
                  size="small"
                  onDelete={() => handleArrayFilterChange('deviceTypes', type, false)}
                />
              ))}
              {filters.statuses.map(status => (
                <Chip
                  key={status}
                  label={`Estado: ${status}`}
                  size="small"
                  color={getStatusColor(status) as any}
                  onDelete={() => handleArrayFilterChange('statuses', status, false)}
                />
              ))}
            </Stack>
          </Paper>
        )}

        {/* Filtros Básicos */}
        <Accordion 
          expanded={expanded.includes('basic')} 
          onChange={() => toggleAccordion('basic')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:search-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Filtros Básicos
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Rango de fechas */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Rango de Fechas
                </Typography>
                <Stack spacing={2}>
                  <DatePicker
                    label="Fecha desde"
                    value={filters.dateRange.from || null}
                    onChange={(date) => handleNestedFilterChange('dateRange', 'from', date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                  <DatePicker
                    label="Fecha hasta"
                    value={filters.dateRange.to || null}
                    onChange={(date) => handleNestedFilterChange('dateRange', 'to', date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Stack>
              </Grid>

              {/* Información del cliente */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Cliente
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Nombre del cliente"
                    value={filters.clientName || ''}
                    onChange={(e) => handleFilterChange('clientName', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Teléfono"
                    value={filters.clientPhone || ''}
                    onChange={(e) => handleFilterChange('clientPhone', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.hasEmail || false}
                        onChange={(e) => handleFilterChange('hasEmail', e.target.checked)}
                      />
                    }
                    label="Solo clientes con email"
                  />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Filtros de Dispositivo */}
        <Accordion 
          expanded={expanded.includes('device')} 
          onChange={() => toggleAccordion('device')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:cube-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Dispositivos
              </Typography>
              {(filters.deviceTypes.length + filters.deviceBrands.length) > 0 && (
                <Chip
                  label={filters.deviceTypes.length + filters.deviceBrands.length}
                  size="small"
                  color="primary"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Tipos de Dispositivo
                </Typography>
                <Stack>
                  {availableOptions.deviceTypes.map(type => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={filters.deviceTypes.includes(type)}
                          onChange={(e) => handleArrayFilterChange('deviceTypes', type, e.target.checked)}
                        />
                      }
                      label={type}
                    />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Marcas
                </Typography>
                <Stack>
                  {availableOptions.deviceBrands.map(brand => (
                    <FormControlLabel
                      key={brand}
                      control={
                        <Checkbox
                          checked={filters.deviceBrands.includes(brand)}
                          onChange={(e) => handleArrayFilterChange('deviceBrands', brand, e.target.checked)}
                        />
                      }
                      label={brand}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Filtros de Estado */}
        <Accordion 
          expanded={expanded.includes('status')} 
          onChange={() => toggleAccordion('status')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:flag-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Estados y Técnicos
              </Typography>
              {filters.statuses.length > 0 && (
                <Chip
                  label={filters.statuses.length}
                  size="small"
                  color="secondary"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Estados de Reparación
                </Typography>
                <Stack>
                  {Object.values(RepairStatus).map(status => (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          checked={filters.statuses.includes(status)}
                          onChange={(e) => handleArrayFilterChange('statuses', status, e.target.checked)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={status.replace('_', ' ')}
                            size="small"
                            color={getStatusColor(status) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Técnico Asignado
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Seleccionar técnico</InputLabel>
                  <Select
                    value={filters.technician || ''}
                    onChange={(e) => handleFilterChange('technician', e.target.value)}
                    label="Seleccionar técnico"
                  >
                    <MenuItem value="">
                      <em>Todos los técnicos</em>
                    </MenuItem>
                    {availableOptions.technicians.map(tech => (
                      <MenuItem key={tech} value={tech}>
                        {tech}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.excludeDelivered || false}
                        onChange={(e) => handleFilterChange('excludeDelivered', e.target.checked)}
                      />
                    }
                    label="Excluir entregados"
                  />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Filtros de Costo y Tiempo */}
        <Accordion 
          expanded={expanded.includes('cost')} 
          onChange={() => toggleAccordion('cost')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:dollar-sign-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Costo y Tiempo
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Rango de Costo
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Costo mínimo"
                    type="number"
                    value={filters.costRange.min || ''}
                    onChange={(e) => handleNestedFilterChange('costRange', 'min', Number(e.target.value) || undefined)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Costo máximo"
                    type="number"
                    value={filters.costRange.max || ''}
                    onChange={(e) => handleNestedFilterChange('costRange', 'max', Number(e.target.value) || undefined)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Días en Almacenamiento
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Días mínimos"
                    type="number"
                    value={filters.daysInStorage?.min || ''}
                    onChange={(e) => handleNestedFilterChange('daysInStorage', 'min', Number(e.target.value) || undefined)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Días máximos"
                    type="number"
                    value={filters.daysInStorage?.max || ''}
                    onChange={(e) => handleNestedFilterChange('daysInStorage', 'max', Number(e.target.value) || undefined)}
                    size="small"
                    fullWidth
                  />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Filtros de Garantía */}
        <Accordion 
          expanded={expanded.includes('warranty')} 
          onChange={() => toggleAccordion('warranty')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:shield-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Garantías
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Estado de Garantía
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado de garantía</InputLabel>
                  <Select
                    value={filters.warrantyStatus || ''}
                    onChange={(e) => handleFilterChange('warrantyStatus', e.target.value)}
                    label="Estado de garantía"
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    <MenuItem value="active">Activas</MenuItem>
                    <MenuItem value="expired">Expiradas</MenuItem>
                    <MenuItem value="expiring">Por expirar</MenuItem>
                    <MenuItem value="none">Sin garantía</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Reclamos
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.hasWarrantyClaims || false}
                      onChange={(e) => handleFilterChange('hasWarrantyClaims', e.target.checked)}
                    />
                  }
                  label="Solo órdenes con reclamos de garantía"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Filtros de Urgencia y Ordenamiento */}
        <Accordion 
          expanded={expanded.includes('sorting')} 
          onChange={() => toggleAccordion('sorting')}
        >
          <AccordionSummary expandIcon={<Icon icon="eva:chevron-down-outline" />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:options-outline" width={20} />
              <Typography variant="subtitle1" fontWeight="bold">
                Urgencia y Ordenamiento
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Filtros de Urgencia
                </Typography>
                <Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.urgentOnly || false}
                        onChange={(e) => handleFilterChange('urgentOnly', e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon icon="eva:alert-triangle-outline" width={16} color="warning.main" />
                        Solo elementos urgentes
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.criticalOnly || false}
                        onChange={(e) => handleFilterChange('criticalOnly', e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon icon="eva:alert-circle-outline" width={16} color="error.main" />
                        Solo elementos críticos
                      </Box>
                    }
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Ordenamiento
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ordenar por</InputLabel>
                    <Select
                      value={filters.sortBy || 'createdAt'}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      label="Ordenar por"
                    >
                      <MenuItem value="createdAt">Fecha de creación</MenuItem>
                      <MenuItem value="folio">Folio</MenuItem>
                      <MenuItem value="clientName">Nombre del cliente</MenuItem>
                      <MenuItem value="totalCost">Costo total</MenuItem>
                      <MenuItem value="completedAt">Fecha de completado</MenuItem>
                      <MenuItem value="daysInStorage">Días en almacén</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Orden</InputLabel>
                    <Select
                      value={filters.sortOrder || 'desc'}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                      label="Orden"
                    >
                      <MenuItem value="asc">Ascendente</MenuItem>
                      <MenuItem value="desc">Descendente</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {activeFiltersCount} filtros activos
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose}>
              Cancelar
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                color="warning"
                onClick={handleReset}
              >
                Limpiar
              </Button>
            )}
            
            <Button
              variant="contained"
              onClick={handleApply}
              startIcon={<Icon icon="eva:checkmark-outline" />}
            >
              Aplicar Filtros
            </Button>
          </Stack>
        </Box>
      </DialogActions>
    </Dialog>
  );
}