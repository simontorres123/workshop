import { Client } from './client';

export enum RepairStatus {
  PENDING_DIAGNOSIS = 'pending_diagnosis',
  DIAGNOSIS_CONFIRMED = 'diagnosis_confirmed',
  REPAIR_ACCEPTED = 'repair_accepted',
  REPAIR_REJECTED = 'repair_rejected',
  IN_REPAIR = 'in_repair',
  REPAIRED = 'repaired',
  DELIVERED = 'delivered',
  COMPLETED = 'completed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  ADVANCE_PAID = 'advance_paid',
  PAID = 'paid'
}

export interface ImageMetadata {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  blobName: string;
  containerName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface RepairOrder {
  id: string;
  type: 'repair_order';
  folio: string; // Folio único generado automáticamente
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Información del aparato
  deviceType: string; // Ej: "Lavadora", "Refrigerador", "Microondas"
  deviceBrand: string;
  deviceModel?: string;
  deviceSerial?: string;
  deviceDescription: string; // Descripción general del aparato
  
  // Diagnóstico y problema
  problemDescription: string; // Descripción del problema reportado
  initialDiagnosis: string; // Diagnóstico preliminar
  confirmedDiagnosis?: string; // Diagnóstico confirmado después de revisión
  requiredParts?: string[]; // Piezas necesarias
  laborCost?: number; // Costo de mano de obra
  partsCost?: number; // Costo de piezas
  totalCost?: number; // Costo total estimado
  
  // Estado y fechas
  status: string;
  paymentStatus?: string;
  estimatedDate?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  
  // Pagos
  advancePayment?: number; // Anticipo recibido
  totalPayment?: number; // Pago total
  remainingPayment?: number; // Saldo pendiente
  
  // Notas e imágenes
  notes?: string[];
  statusNotes?: StatusNote[] | string; // Historial de notas de estado (nuevo formato) o string (formato legacy)
  images?: string[]; // URLs de imágenes
  
  // Garantía y almacenamiento
  warrantyPeriodMonths?: number; // Período de garantía en meses (default: 3)
  storagePeriodMonths?: number; // Período de almacenamiento en meses (default: 1)
  warrantyClaims?: WarrantyClaim[]; // Historial de reclamos de garantía
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // ID del usuario que creó la orden
}

export interface RepairNote {
  _id: string;
  content: string;
  isVisibleToClient: boolean; // Si la nota es visible al cliente en el seguimiento público
  createdAt: Date;
  createdBy?: string; // ID del usuario que creó la nota
}

export interface StatusNote {
  id: string;
  previousStatus?: string; // Estado anterior
  newStatus: string; // Nuevo estado
  note?: string; // Nota opcional
  createdAt: Date;
  createdBy?: string; // ID del usuario que hizo el cambio
}

export interface DigitalSignature {
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

export interface WarrantyClaim {
  id: string;
  date: Date;
  reason: string;
  technician: string;
  notes?: string;
  createdBy?: string;
  clientSignature?: DigitalSignature; // Firma del cliente
  technicianSignature?: DigitalSignature; // Firma del técnico
  supervisorSignature?: DigitalSignature; // Firma del supervisor (para casos especiales)
  attachments?: string[]; // URLs de documentos adicionales
  resolution?: string; // Descripción de la resolución del reclamo
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
}

export interface CreateRepairOrderRequest {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  organizationId?: string;
  branchId?: string;
  
  deviceType: string;
  deviceBrand: string;
  deviceModel?: string;
  deviceSerial?: string;
  deviceDescription: string;
  
  problemDescription: string;
  initialDiagnosis: string;
  requiredParts?: string[];
  
  status?: string;
  estimatedDate?: Date;
  advancePayment?: number;
  totalCost?: number;
  notes?: string[];
  images?: string[];
  
  // Garantía y almacenamiento
  warrantyPeriodMonths?: number;
  storagePeriodMonths?: number;
}

export interface UpdateRepairOrderRequest {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  deviceDescription?: string;
  
  problemDescription?: string;
  initialDiagnosis?: string;
  confirmedDiagnosis?: string;
  requiredParts?: string[];
  
  status?: string;
  paymentStatus?: string;
  estimatedDate?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  advancePayment?: number;
  totalPayment?: number;
  remainingPayment?: number;
  
  notes?: string[];
  statusNotes?: string;
  images?: string[];
}

export interface RepairOrderSearchFilters {
  search?: string;
  status?: string;
  clientId?: string;
  branchId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'createdAt' | 'folio' | 'status' | 'clientName';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Tipo para el seguimiento público (sin información sensible)
export interface PublicRepairStatus {
  folio: string;
  status: RepairStatus;
  device: {
    type: string;
    brand: string;
    model?: string;
    description: string;
  };
  estimatedCompletionDate?: Date;
  publicNotes: RepairNote[];
  images: ImageMetadata[];
  createdAt: Date;
  updatedAt: Date;
  // Payment info for transparency
  totalCost?: number;
  advancePayment?: number;
}

// Estados con sus mensajes y colores para la UI
export const REPAIR_STATUS_CONFIG = {
  [RepairStatus.PENDING_DIAGNOSIS]: {
    label: 'En espera de diagnóstico',
    description: 'Su aparato ha sido recibido y está pendiente de revisión técnica.',
    color: 'warning' as const,
    icon: 'eva:clock-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  [RepairStatus.DIAGNOSIS_CONFIRMED]: {
    label: 'Diagnóstico confirmado',
    description: 'Se ha confirmado el diagnóstico. Esperando su autorización para proceder.',
    color: 'info' as const,
    icon: 'eva:checkmark-circle-2-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  [RepairStatus.REPAIR_ACCEPTED]: {
    label: 'Reparación aceptada',
    description: 'Ha autorizado la reparación. Procederemos con los trabajos.',
    color: 'success' as const,
    icon: 'eva:done-all-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  [RepairStatus.REPAIR_REJECTED]: {
    label: 'Reparación rechazada',
    description: 'Ha decidido no proceder con la reparación. Puede recoger su aparato.',
    color: 'error' as const,
    icon: 'eva:close-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email', 'schedule_pickup']
  },
  [RepairStatus.IN_REPAIR]: {
    label: 'En reparación',
    description: 'Su aparato está siendo reparado por nuestros técnicos.',
    color: 'primary' as const,
    icon: 'eva:settings-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  [RepairStatus.REPAIRED]: {
    label: 'Reparado',
    description: 'Su aparato ha sido reparado exitosamente. Puede pasar a recogerlo.',
    color: 'success' as const,
    icon: 'eva:checkmark-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email', 'schedule_pickup']
  },
  [RepairStatus.DELIVERED]: {
    label: 'Entregado',
    description: 'Su aparato ha sido entregado. ¡Gracias por confiar en nosotros!',
    color: 'success' as const,
    icon: 'eva:gift-outline',
    allowClientActions: ['contact_whatsapp', 'rate_service']
  },
  // Estados adicionales que pueden existir en la base de datos
  'completed': {
    label: 'Completado',
    description: 'El trabajo ha sido completado exitosamente.',
    color: 'success' as const,
    icon: 'eva:checkmark-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  'cancelled': {
    label: 'Cancelado',
    description: 'La orden ha sido cancelada.',
    color: 'error' as const,
    icon: 'eva:close-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  // Mapeo de valores enum a string para compatibilidad
  'pending_diagnosis': {
    label: 'En espera de diagnóstico',
    description: 'Su aparato ha sido recibido y está pendiente de revisión técnica.',
    color: 'warning' as const,
    icon: 'eva:clock-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  'diagnosis_confirmed': {
    label: 'Diagnóstico confirmado',
    description: 'Se ha confirmado el diagnóstico. Esperando su autorización para proceder.',
    color: 'info' as const,
    icon: 'eva:checkmark-circle-2-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  'repair_accepted': {
    label: 'Reparación aceptada',
    description: 'Ha autorizado la reparación. Procederemos con los trabajos.',
    color: 'success' as const,
    icon: 'eva:done-all-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  'repair_rejected': {
    label: 'Reparación rechazada',
    description: 'Ha decidido no proceder con la reparación. Puede recoger su aparato.',
    color: 'error' as const,
    icon: 'eva:close-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email', 'schedule_pickup']
  },
  'in_repair': {
    label: 'En reparación',
    description: 'Su aparato está siendo reparado por nuestros técnicos.',
    color: 'primary' as const,
    icon: 'eva:settings-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email']
  },
  'repaired': {
    label: 'Reparado',
    description: 'Su aparato ha sido reparado exitosamente. Puede pasar a recogerlo.',
    color: 'success' as const,
    icon: 'eva:checkmark-circle-outline',
    allowClientActions: ['contact_whatsapp', 'contact_email', 'schedule_pickup']
  },
  'delivered': {
    label: 'Entregado',
    description: 'Su aparato ha sido entregado. ¡Gracias por confiar en nosotros!',
    color: 'success' as const,
    icon: 'eva:gift-outline',
    allowClientActions: ['contact_whatsapp', 'rate_service']
  }
} as const;

export const PAYMENT_STATUS_CONFIG = {
  [PaymentStatus.PENDING]: {
    label: 'Pago pendiente',
    color: 'warning' as const
  },
  [PaymentStatus.ADVANCE_PAID]: {
    label: 'Anticipo pagado',
    color: 'info' as const
  },
  [PaymentStatus.PAID]: {
    label: 'Pagado',
    color: 'success' as const
  }
} as const;