import { z } from 'zod';

// Esquema para reclamo de garantía
export const warrantyClaimSchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres').max(500, 'El motivo no puede exceder 500 caracteres'),
  technician: z.string().min(2, 'El nombre del técnico debe tener al menos 2 caracteres').max(100, 'El nombre del técnico no puede exceder 100 caracteres'),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
  createdBy: z.string().optional()
});

// Esquema para crear un nuevo reclamo de garantía
export const createWarrantyClaimSchema = z.object({
  reason: z.string().min(3, 'El motivo debe tener al menos 3 caracteres').max(500, 'El motivo no puede exceder 500 caracteres'),
  technician: z.string().min(2, 'El nombre del técnico debe tener al menos 2 caracteres').max(100, 'El nombre del técnico no puede exceder 100 caracteres'),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

// Esquema para los campos de garantía y almacenamiento en RepairOrder
export const warrantyStorageSchema = z.object({
  warrantyPeriodMonths: z.number()
    .int('El período de garantía debe ser un número entero')
    .min(1, 'El período de garantía debe ser al menos 1 mes')
    .max(60, 'El período de garantía no puede exceder 60 meses')
    .default(3),
  storagePeriodMonths: z.number()
    .int('El período de almacenamiento debe ser un número entero')
    .min(1, 'El período de almacenamiento debe ser al menos 1 mes')
    .max(24, 'El período de almacenamiento no puede exceder 24 meses')
    .default(1),
  warrantyClaims: z.array(warrantyClaimSchema).default([])
});

// Esquema para actualizar garantía y almacenamiento
export const updateWarrantyStorageSchema = z.object({
  warrantyPeriodMonths: z.number()
    .int('El período de garantía debe ser un número entero')
    .min(1, 'El período de garantía debe ser al menos 1 mes')
    .max(60, 'El período de garantía no puede exceder 60 meses')
    .optional(),
  storagePeriodMonths: z.number()
    .int('El período de almacenamiento debe ser un número entero')
    .min(1, 'El período de almacenamiento debe ser al menos 1 mes')
    .max(24, 'El período de almacenamiento no puede exceder 24 meses')
    .optional()
});

// Tipos derivados
export type WarrantyClaim = z.infer<typeof warrantyClaimSchema>;
export type CreateWarrantyClaimRequest = z.infer<typeof createWarrantyClaimSchema>;
export type WarrantyStorageData = z.infer<typeof warrantyStorageSchema>;
export type UpdateWarrantyStorageRequest = z.infer<typeof updateWarrantyStorageSchema>;