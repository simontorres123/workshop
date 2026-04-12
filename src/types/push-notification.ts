// Tipos y configuraciones para notificaciones push automáticas

export interface PushNotificationTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface PushNotificationSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: PushNotificationTime;
  weekday?: number; // 1=lunes, 7=domingo (para weekly)
  dayOfMonth?: number; // 1-31 (para monthly)
  customCron?: string; // Para horarios muy específicos
}

export interface PushNotificationConfig {
  enabled: boolean;
  sound: 'default' | 'warning' | 'success' | 'error' | 'silent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requireInteraction: boolean;
  stackNotifications: boolean; // Si las notificaciones se apilan o se reemplazan
  vibrationPattern?: number[]; // Patrón de vibración para móviles
  customSound?: string; // URL de sonido personalizado
}

export interface PushNotificationData {
  url?: string; // URL a la que navegar al hacer clic
  actionType?: 'navigate' | 'external' | 'modal' | 'none';
  metadata?: Record<string, any>; // Datos adicionales específicos del tipo
}

export interface PushNotificationTemplate {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: PushNotificationData;
  actions?: PushNotificationAction[];
}

export interface PushNotificationAction {
  action: string; // ID único de la acción
  title: string; // Texto del botón
  icon?: string; // Ícono del botón
  type?: 'primary' | 'secondary' | 'destructive';
}

export interface ScheduledPushNotification {
  id: string;
  type: PushNotificationType;
  title: string;
  description: string;
  schedule: PushNotificationSchedule;
  config: PushNotificationConfig;
  template: PushNotificationTemplate;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun: string;
  runCount: number;
  failureCount: number;
  isActive: boolean;
  createdBy?: string; // ID del usuario que la creó
  tags?: string[]; // Etiquetas para organización
}

export enum PushNotificationType {
  WARRANTY_EXPIRING = 'warranty_expiring',
  LOW_STOCK = 'low_stock',
  PENDING_REPAIRS = 'pending_repairs',
  DAILY_SUMMARY = 'daily_summary',
  BACKUP_REMINDER = 'backup_reminder',
  INVENTORY_ALERT = 'inventory_alert',
  PAYMENT_DUE = 'payment_due',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SECURITY_ALERT = 'security_alert',
  CUSTOM = 'custom'
}

export interface PushNotificationTypeConfig {
  type: PushNotificationType;
  displayName: string;
  description: string;
  category: 'business' | 'system' | 'security' | 'maintenance';
  icon: string;
  defaultSchedule: PushNotificationSchedule;
  defaultConfig: PushNotificationConfig;
  template: PushNotificationTemplate;
  requiredPermissions?: string[];
  canBeDisabled: boolean;
}

// Configuraciones predefinidas para cada tipo de notificación push
export const PUSH_NOTIFICATION_TYPES: Record<PushNotificationType, PushNotificationTypeConfig> = {
  [PushNotificationType.WARRANTY_EXPIRING]: {
    type: PushNotificationType.WARRANTY_EXPIRING,
    displayName: 'Garantías por Vencer',
    description: 'Notifica cuando productos están próximos a vencer la garantía',
    category: 'business',
    icon: 'eva:alert-triangle-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 9, minute: 0 }
    },
    defaultConfig: {
      enabled: true,
      sound: 'warning',
      priority: 'high',
      requireInteraction: true,
      stackNotifications: false
    },
    template: {
      title: '⚠️ Garantías por Vencer',
      body: 'Tienes {{count}} productos con garantía que vence en los próximos {{days}} días',
      icon: '/favicon.ico',
      data: {
        url: '/admin/inventory?filter=warranty_expiring',
        actionType: 'navigate'
      },
      actions: [
        {
          action: 'view_details',
          title: 'Ver Detalles',
          type: 'primary'
        },
        {
          action: 'remind_later',
          title: 'Recordar Después',
          type: 'secondary'
        }
      ]
    },
    canBeDisabled: true
  },

  [PushNotificationType.LOW_STOCK]: {
    type: PushNotificationType.LOW_STOCK,
    displayName: 'Stock Bajo',
    description: 'Alerta cuando productos tienen inventario por debajo del mínimo',
    category: 'business',
    icon: 'eva:cube-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 18, minute: 0 }
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'normal',
      requireInteraction: false,
      stackNotifications: true
    },
    template: {
      title: '📦 Stock Bajo Detectado',
      body: '{{count}} productos tienen stock por debajo del mínimo establecido',
      icon: '/favicon.ico',
      data: {
        url: '/admin/inventory?filter=low_stock',
        actionType: 'navigate'
      },
      actions: [
        {
          action: 'reorder',
          title: 'Reordenar',
          type: 'primary'
        },
        {
          action: 'view_list',
          title: 'Ver Lista',
          type: 'secondary'
        }
      ]
    },
    canBeDisabled: true
  },

  [PushNotificationType.PENDING_REPAIRS]: {
    type: PushNotificationType.PENDING_REPAIRS,
    displayName: 'Reparaciones Pendientes',
    description: 'Recordatorio de reparaciones sin finalizar',
    category: 'business',
    icon: 'eva:settings-outline',
    defaultSchedule: {
      frequency: 'weekly',
      time: { hour: 10, minute: 0 },
      weekday: 1 // Lunes
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'normal',
      requireInteraction: false,
      stackNotifications: false
    },
    template: {
      title: '🔧 Reparaciones Pendientes',
      body: 'Hay {{count}} reparaciones sin finalizar desde hace más de {{days}} días',
      icon: '/favicon.ico',
      data: {
        url: '/admin/repairs?status=pending',
        actionType: 'navigate'
      },
      actions: [
        {
          action: 'view_repairs',
          title: 'Ver Reparaciones',
          type: 'primary'
        }
      ]
    },
    canBeDisabled: true
  },

  [PushNotificationType.DAILY_SUMMARY]: {
    type: PushNotificationType.DAILY_SUMMARY,
    displayName: 'Resumen Diario',
    description: 'Estadísticas y resumen de actividad del día anterior',
    category: 'business',
    icon: 'eva:bar-chart-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 8, minute: 0 }
    },
    defaultConfig: {
      enabled: false, // Deshabilitado por defecto
      sound: 'default',
      priority: 'low',
      requireInteraction: false,
      stackNotifications: false
    },
    template: {
      title: '📊 Resumen del Día',
      body: 'Ayer: {{sales}} ventas, {{repairs}} reparaciones, ${{revenue}} en ingresos',
      icon: '/favicon.ico',
      data: {
        url: '/admin/dashboard',
        actionType: 'navigate'
      }
    },
    canBeDisabled: true
  },

  [PushNotificationType.BACKUP_REMINDER]: {
    type: PushNotificationType.BACKUP_REMINDER,
    displayName: 'Recordatorio de Backup',
    description: 'Recordatorio para hacer respaldo de datos importantes',
    category: 'maintenance',
    icon: 'eva:hard-drive-outline',
    defaultSchedule: {
      frequency: 'weekly',
      time: { hour: 17, minute: 0 },
      weekday: 5 // Viernes
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'normal',
      requireInteraction: true,
      stackNotifications: false
    },
    template: {
      title: '💾 Recordatorio: Backup',
      body: 'Es hora de hacer un respaldo de tus datos importantes',
      icon: '/favicon.ico',
      data: {
        url: '/admin/system',
        actionType: 'navigate'
      },
      actions: [
        {
          action: 'backup_now',
          title: 'Hacer Backup',
          type: 'primary'
        },
        {
          action: 'schedule_later',
          title: 'Programar Después',
          type: 'secondary'
        }
      ]
    },
    canBeDisabled: true
  },

  [PushNotificationType.INVENTORY_ALERT]: {
    type: PushNotificationType.INVENTORY_ALERT,
    displayName: 'Alerta de Inventario',
    description: 'Notificaciones relacionadas con cambios críticos en inventario',
    category: 'business',
    icon: 'eva:archive-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 12, minute: 0 }
    },
    defaultConfig: {
      enabled: true,
      sound: 'warning',
      priority: 'high',
      requireInteraction: true,
      stackNotifications: true
    },
    template: {
      title: '📋 Alerta de Inventario',
      body: 'Se detectaron cambios importantes en tu inventario',
      icon: '/favicon.ico',
      data: {
        url: '/admin/inventory',
        actionType: 'navigate'
      }
    },
    canBeDisabled: true
  },

  [PushNotificationType.PAYMENT_DUE]: {
    type: PushNotificationType.PAYMENT_DUE,
    displayName: 'Pagos Pendientes',
    description: 'Recordatorio de pagos por cobrar o por pagar',
    category: 'business',
    icon: 'eva:credit-card-outline',
    defaultSchedule: {
      frequency: 'weekly',
      time: { hour: 9, minute: 30 },
      weekday: 1 // Lunes
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'high',
      requireInteraction: true,
      stackNotifications: false
    },
    template: {
      title: '💳 Pagos Pendientes',
      body: 'Tienes {{count}} pagos pendientes por un total de ${{amount}}',
      icon: '/favicon.ico',
      data: {
        url: '/admin/payments',
        actionType: 'navigate'
      }
    },
    canBeDisabled: true
  },

  [PushNotificationType.SYSTEM_MAINTENANCE]: {
    type: PushNotificationType.SYSTEM_MAINTENANCE,
    displayName: 'Mantenimiento del Sistema',
    description: 'Notificaciones sobre mantenimiento y actualizaciones del sistema',
    category: 'system',
    icon: 'eva:settings-2-outline',
    defaultSchedule: {
      frequency: 'weekly',
      time: { hour: 20, minute: 0 },
      weekday: 7 // Domingo
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'normal',
      requireInteraction: false,
      stackNotifications: false
    },
    template: {
      title: '⚙️ Mantenimiento del Sistema',
      body: 'Hay actualizaciones de sistema disponibles o tareas de mantenimiento pendientes',
      icon: '/favicon.ico',
      data: {
        url: '/admin/system',
        actionType: 'navigate'
      }
    },
    canBeDisabled: false
  },

  [PushNotificationType.SECURITY_ALERT]: {
    type: PushNotificationType.SECURITY_ALERT,
    displayName: 'Alerta de Seguridad',
    description: 'Notificaciones críticas de seguridad del sistema',
    category: 'security',
    icon: 'eva:shield-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 0, minute: 0 } // Medianoche - se ejecuta inmediatamente cuando se detecta
    },
    defaultConfig: {
      enabled: true,
      sound: 'error',
      priority: 'urgent',
      requireInteraction: true,
      stackNotifications: true
    },
    template: {
      title: '🛡️ Alerta de Seguridad',
      body: 'Se detectó actividad sospechosa o un problema de seguridad',
      icon: '/favicon.ico',
      data: {
        url: '/admin/security',
        actionType: 'navigate'
      },
      actions: [
        {
          action: 'investigate',
          title: 'Investigar',
          type: 'primary'
        },
        {
          action: 'dismiss',
          title: 'Descartar',
          type: 'destructive'
        }
      ]
    },
    canBeDisabled: false
  },

  [PushNotificationType.CUSTOM]: {
    type: PushNotificationType.CUSTOM,
    displayName: 'Personalizada',
    description: 'Notificación personalizada definida por el usuario',
    category: 'system',
    icon: 'eva:edit-outline',
    defaultSchedule: {
      frequency: 'daily',
      time: { hour: 12, minute: 0 }
    },
    defaultConfig: {
      enabled: true,
      sound: 'default',
      priority: 'normal',
      requireInteraction: false,
      stackNotifications: false
    },
    template: {
      title: 'Notificación Personalizada',
      body: 'Contenido personalizado definido por el usuario',
      icon: '/favicon.ico',
      data: {
        url: '/admin/dashboard',
        actionType: 'navigate'
      }
    },
    canBeDisabled: true
  }
};

// Utilidades para trabajar con notificaciones push
export class PushNotificationUtils {
  /**
   * Valida una configuración de notificación push
   */
  static validateNotification(notification: Partial<ScheduledPushNotification>): string[] {
    const errors: string[] = [];

    if (!notification.type) {
      errors.push('Tipo de notificación es requerido');
    }

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Título es requerido');
    }

    if (!notification.schedule) {
      errors.push('Horario es requerido');
    } else {
      const { time, weekday, frequency } = notification.schedule;
      
      if (time.hour < 0 || time.hour > 23) {
        errors.push('Hora debe estar entre 0 y 23');
      }
      
      if (time.minute < 0 || time.minute > 59) {
        errors.push('Minutos deben estar entre 0 y 59');
      }
      
      if (frequency === 'weekly' && (!weekday || weekday < 1 || weekday > 7)) {
        errors.push('Día de la semana debe estar entre 1 (lunes) y 7 (domingo)');
      }
    }

    return errors;
  }

  /**
   * Genera un ID único para una notificación push
   */
  static generateNotificationId(type: PushNotificationType): string {
    return `push_notification_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcula la próxima fecha de ejecución
   */
  static calculateNextRun(schedule: PushNotificationSchedule, from: Date = new Date()): Date {
    const nextRun = new Date(from);
    const { frequency, time, weekday } = schedule;

    nextRun.setHours(time.hour, time.minute, 0, 0);

    switch (frequency) {
      case 'daily':
        if (nextRun <= from) {
          nextRun.setDate(from.getDate() + 1);
        }
        break;

      case 'weekly':
        if (!weekday) break;
        
        const currentWeekday = from.getDay();
        const targetWeekday = weekday === 7 ? 0 : weekday; // Convertir domingo (7) a 0
        
        let daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;
        
        if (daysUntilTarget === 0 && nextRun <= from) {
          daysUntilTarget = 7; // Próxima semana
        }
        
        nextRun.setDate(from.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        // Implementar lógica mensual si es necesario
        nextRun.setMonth(from.getMonth() + 1);
        break;
    }

    return nextRun;
  }

  /**
   * Formatea un horario para mostrar al usuario
   */
  static formatSchedule(schedule: PushNotificationSchedule): string {
    const { frequency, time, weekday } = schedule;
    const timeString = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;

    switch (frequency) {
      case 'daily':
        return `Diario a las ${timeString}`;
      
      case 'weekly':
        const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const weekdayName = weekdays[weekday === 7 ? 0 : weekday || 1];
        return `${weekdayName} a las ${timeString}`;
      
      case 'monthly':
        return `Mensual a las ${timeString}`;
      
      default:
        return `Personalizado: ${timeString}`;
    }
  }

  /**
   * Procesa plantillas con variables
   */
  static processTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  /**
   * Obtiene la configuración por defecto para un tipo de notificación push
   */
  static getDefaultConfig(type: PushNotificationType): PushNotificationTypeConfig {
    return PUSH_NOTIFICATION_TYPES[type] || PUSH_NOTIFICATION_TYPES[PushNotificationType.CUSTOM];
  }

  /**
   * Verifica si una notificación push puede ser deshabilitada
   */
  static canBeDisabled(type: PushNotificationType): boolean {
    return PUSH_NOTIFICATION_TYPES[type]?.canBeDisabled ?? true;
  }

  /**
   * Convierte un schedule string del servidor a PushNotificationSchedule
   */
  static parseScheduleString(scheduleString: string): PushNotificationSchedule | null {
    if (scheduleString.startsWith('custom_')) {
      const parts = scheduleString.split('_');
      
      if (parts[1] === 'daily') {
        // custom_daily_9h30m
        const timePart = parts[2];
        const hourMatch = timePart.match(/(\d+)h/);
        const minuteMatch = timePart.match(/(\d+)m/);
        const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        
        return {
          frequency: 'daily',
          time: { hour, minute }
        };
        
      } else if (parts[1] === 'weekly') {
        // custom_weekly_lunes_9h30m
        const weekdayName = parts[2];
        const timePart = parts[3];
        const hourMatch = timePart.match(/(\d+)h/);
        const minuteMatch = timePart.match(/(\d+)m/);
        const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        
        // Mapear nombres a números
        const weekdayMap: Record<string, number> = {
          'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 
          'viernes': 5, 'sábado': 6, 'domingo': 7
        };
        
        return {
          frequency: 'weekly',
          time: { hour, minute },
          weekday: weekdayMap[weekdayName] || 1
        };
      }
    }
    
    // Horarios predefinidos
    const predefinedSchedules: Record<string, PushNotificationSchedule> = {
      'daily_8am': { frequency: 'daily', time: { hour: 8, minute: 0 } },
      'daily_9am': { frequency: 'daily', time: { hour: 9, minute: 0 } },
      'daily_6pm': { frequency: 'daily', time: { hour: 18, minute: 0 } },
      'weekly_monday_10am': { frequency: 'weekly', time: { hour: 10, minute: 0 }, weekday: 1 },
      'weekly_friday_5pm': { frequency: 'weekly', time: { hour: 17, minute: 0 }, weekday: 5 }
    };
    
    return predefinedSchedules[scheduleString] || null;
  }

  /**
   * Genera estadísticas de una notificación
   */
  static generateStats(notification: ScheduledPushNotification) {
    const successRate = notification.runCount > 0 
      ? ((notification.runCount - notification.failureCount) / notification.runCount) * 100 
      : 0;
    
    return {
      totalRuns: notification.runCount,
      successfulRuns: notification.runCount - notification.failureCount,
      failedRuns: notification.failureCount,
      successRate: Math.round(successRate),
      lastRunAgo: notification.lastRun 
        ? Math.floor((Date.now() - new Date(notification.lastRun).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      nextRunIn: Math.floor((new Date(notification.nextRun).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    };
  }
}

// Schema para validación con Zod (opcional)
export const PushNotificationScheduleSchema = {
  frequency: ['daily', 'weekly', 'monthly', 'custom'],
  time: {
    hour: { min: 0, max: 23 },
    minute: { min: 0, max: 59 }
  },
  weekday: { min: 1, max: 7, optional: true },
  dayOfMonth: { min: 1, max: 31, optional: true }
};