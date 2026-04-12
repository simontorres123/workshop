import { z } from 'zod';
import { PushNotificationType } from '@/types/push-notification';

// Schema para validar tiempo de notificación
export const PushNotificationTimeSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59)
});

// Schema para validar horario de notificación
export const PushNotificationScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  time: PushNotificationTimeSchema,
  weekday: z.number().min(1).max(7).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  customCron: z.string().optional()
});

// Schema para validar configuración de notificación
export const PushNotificationConfigSchema = z.object({
  enabled: z.boolean(),
  sound: z.enum(['default', 'warning', 'success', 'error', 'silent']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requireInteraction: z.boolean(),
  stackNotifications: z.boolean(),
  vibrationPattern: z.array(z.number()).optional(),
  customSound: z.string().url().optional()
});

// Schema para datos de notificación
export const PushNotificationDataSchema = z.object({
  url: z.string().optional(),
  actionType: z.enum(['navigate', 'external', 'modal', 'none']).optional(),
  metadata: z.record(z.any()).optional()
});

// Schema para acciones de notificación
export const PushNotificationActionSchema = z.object({
  action: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().optional(),
  type: z.enum(['primary', 'secondary', 'destructive']).optional()
});

// Schema para plantilla de notificación
export const PushNotificationTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  icon: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().url().optional(),
  data: PushNotificationDataSchema.optional(),
  actions: z.array(PushNotificationActionSchema).max(3).optional()
});

// Schema para notificación programada completa
export const ScheduledPushNotificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'warranty_expiring',
    'low_stock',
    'pending_repairs',
    'daily_summary',
    'backup_reminder',
    'inventory_alert',
    'payment_due',
    'system_maintenance',
    'security_alert',
    'custom'
  ]),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  schedule: PushNotificationScheduleSchema,
  config: PushNotificationConfigSchema,
  template: PushNotificationTemplateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastRun: z.string().datetime().optional(),
  nextRun: z.string().datetime(),
  runCount: z.number().min(0),
  failureCount: z.number().min(0),
  isActive: z.boolean(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Schema para crear una nueva notificación
export const CreatePushNotificationSchema = z.object({
  type: z.string().min(1),
  schedule: z.string().min(1),
  config: z.object({
    testRun: z.boolean().optional(),
    customTime: z.object({
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59)
    }).optional(),
    frequency: z.enum(['daily', 'weekly']).optional(),
    weekday: z.number().min(1).max(7).optional()
  }).optional()
});

// Schema para actualizar una notificación existente
export const UpdatePushNotificationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(300).optional(),
  schedule: PushNotificationScheduleSchema.optional(),
  config: PushNotificationConfigSchema.optional(),
  template: PushNotificationTemplateSchema.optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

// Schema para envío de notificación automática
export const SendAutoPushNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.object({
    url: z.string().optional()
  }).optional()
});

// Schema para suscripción web push
export const WebPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

// Schema para eliminar notificación
export const DeletePushNotificationSchema = z.object({
  id: z.string().min(1)
});

// Tipos TypeScript derivados de los schemas
export type PushNotificationTimeInput = z.infer<typeof PushNotificationTimeSchema>;
export type PushNotificationScheduleInput = z.infer<typeof PushNotificationScheduleSchema>;
export type PushNotificationConfigInput = z.infer<typeof PushNotificationConfigSchema>;
export type PushNotificationDataInput = z.infer<typeof PushNotificationDataSchema>;
export type PushNotificationActionInput = z.infer<typeof PushNotificationActionSchema>;
export type PushNotificationTemplateInput = z.infer<typeof PushNotificationTemplateSchema>;
export type ScheduledPushNotificationInput = z.infer<typeof ScheduledPushNotificationSchema>;
export type CreatePushNotificationInput = z.infer<typeof CreatePushNotificationSchema>;
export type UpdatePushNotificationInput = z.infer<typeof UpdatePushNotificationSchema>;
export type SendAutoPushNotificationInput = z.infer<typeof SendAutoPushNotificationSchema>;
export type WebPushSubscriptionInput = z.infer<typeof WebPushSubscriptionSchema>;
export type DeletePushNotificationInput = z.infer<typeof DeletePushNotificationSchema>;

// Funciones de validación
export const validatePushNotificationTime = (data: unknown) => {
  return PushNotificationTimeSchema.safeParse(data);
};

export const validatePushNotificationSchedule = (data: unknown) => {
  return PushNotificationScheduleSchema.safeParse(data);
};

export const validatePushNotificationConfig = (data: unknown) => {
  return PushNotificationConfigSchema.safeParse(data);
};

export const validateScheduledPushNotification = (data: unknown) => {
  return ScheduledPushNotificationSchema.safeParse(data);
};

export const validateCreatePushNotification = (data: unknown) => {
  return CreatePushNotificationSchema.safeParse(data);
};

export const validateUpdatePushNotification = (data: unknown) => {
  return UpdatePushNotificationSchema.safeParse(data);
};

export const validateSendAutoPushNotification = (data: unknown) => {
  return SendAutoPushNotificationSchema.safeParse(data);
};

export const validateWebPushSubscription = (data: unknown) => {
  return WebPushSubscriptionSchema.safeParse(data);
};

export const validateDeletePushNotification = (data: unknown) => {
  return DeletePushNotificationSchema.safeParse(data);
};

// Errores personalizados
export class PushNotificationValidationError extends Error {
  public errors: z.ZodIssue[];

  constructor(message: string, errors: z.ZodIssue[]) {
    super(message);
    this.name = 'PushNotificationValidationError';
    this.errors = errors;
  }

  public getErrorMessages(): string[] {
    return this.errors.map(error => {
      const path = error.path.join('.');
      return `${path}: ${error.message}`;
    });
  }
}

// Helper para manejar errores de validación
export const handleValidationError = (result: z.SafeParseReturnType<any, any>) => {
  if (!result.success) {
    throw new PushNotificationValidationError(
      'Error de validación en notificación push',
      result.error.errors
    );
  }
  return result.data;
};

// Constantes de validación
export const PUSH_NOTIFICATION_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  BODY_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 300,
  MAX_ACTIONS: 3,
  MAX_TAGS: 10,
  MAX_FAILURES_BEFORE_DISABLE: 5,
  MIN_SCHEDULE_INTERVAL_MINUTES: 1,
  MAX_SCHEDULE_INTERVAL_DAYS: 365
} as const;

// Validadores específicos para reglas de negocio
export const validateNotificationFrequency = (schedule: PushNotificationScheduleInput): boolean => {
  const { frequency, weekday, dayOfMonth } = schedule;
  
  if (frequency === 'weekly' && !weekday) {
    throw new Error('Día de la semana es requerido para frecuencia semanal');
  }
  
  if (frequency === 'monthly' && !dayOfMonth) {
    throw new Error('Día del mes es requerido para frecuencia mensual');
  }
  
  return true;
};

export const validateNotificationTime = (time: PushNotificationTimeInput): boolean => {
  // Validaciones adicionales de horario pueden ir aquí
  // Por ejemplo, evitar horarios muy tempranos o muy tardíos
  
  if (time.hour < 6 || time.hour > 22) {
    console.warn(`Horario ${time.hour}:${time.minute} está fuera del rango recomendado (06:00-22:00)`);
  }
  
  return true;
};

export const validateNotificationConfig = (config: PushNotificationConfigInput): boolean => {
  // Validar patrones de vibración
  if (config.vibrationPattern && config.vibrationPattern.length > 10) {
    throw new Error('Patrón de vibración no puede tener más de 10 elementos');
  }
  
  // Validar URL de sonido personalizado
  if (config.customSound) {
    try {
      new URL(config.customSound);
    } catch {
      throw new Error('URL de sonido personalizado no es válida');
    }
  }
  
  return true;
};