import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { RepairStatus, REPAIR_STATUS_CONFIG } from '@/types/repair';

export const REPAIR_STATUS_FLOW = [
  { value: RepairStatus.PENDING_DIAGNOSIS, label: 'Recibido' },
  { value: RepairStatus.DIAGNOSIS_CONFIRMED, label: 'Diagnóstico' },
  { value: RepairStatus.REPAIR_ACCEPTED, label: 'Autorizado' },
  { value: RepairStatus.IN_REPAIR, label: 'En reparación' },
  { value: RepairStatus.REPAIRED, label: 'Reparado' },
  { value: RepairStatus.DELIVERED, label: 'Entregado' },
  { value: RepairStatus.COMPLETED, label: 'Completado' },
];

export const getNextRepairStatus = (status: string) => {
  const index = REPAIR_STATUS_FLOW.findIndex((step) => step.value === status);
  return index >= 0 && index < REPAIR_STATUS_FLOW.length - 1
    ? REPAIR_STATUS_FLOW[index + 1].value
    : '';
};

interface RepairStatusStepperProps {
  currentStatus: string;
  isMobile?: boolean;
}

export default function RepairStatusStepper({ currentStatus, isMobile = false }: RepairStatusStepperProps) {
  const currentIndex = REPAIR_STATUS_FLOW.findIndex((step) => step.value === currentStatus);
  const config = REPAIR_STATUS_CONFIG[currentStatus as keyof typeof REPAIR_STATUS_CONFIG];

  if (currentStatus === RepairStatus.REPAIR_REJECTED || currentStatus === 'cancelled') {
    return (
      <Alert severity="error" icon={<Icon icon="eva:close-circle-outline" />}>
        <Typography variant="subtitle2">Proceso detenido</Typography>
        <Typography variant="body2">La reparación fue rechazada o cancelada.</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      <Stepper activeStep={Math.max(currentIndex, 0)} orientation={isMobile ? 'vertical' : 'horizontal'} alternativeLabel={!isMobile}>
        {REPAIR_STATUS_FLOW.map((step) => (
          <Step key={step.value} completed={currentIndex >= 0 && REPAIR_STATUS_FLOW.findIndex((item) => item.value === step.value) < currentIndex}>
            <StepLabel>
              <Typography variant="caption" sx={{ fontWeight: step.value === currentStatus ? 700 : 400 }}>
                {step.label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: isMobile ? 'flex-start' : 'center' }}>
        <Chip
          size="small"
          variant="outlined"
          color={(config?.color || 'default') as any}
          label={`Estado actual: ${config?.label || currentStatus}`}
        />
      </Box>
    </Box>
  );
}
