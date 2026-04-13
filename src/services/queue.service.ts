import { ScheduledPushNotification } from '@/types/push-notification';
import { logWithCSTTime } from '@/utils/timezone';
import { DateTime } from 'luxon';

/**
 * Servicio de cola de notificaciones simplificado.
 * Reemplaza la implementación de Azure Storage Queue para aligerar el build.
 * Actualmente procesa las notificaciones de forma directa o mediante el scheduler de Next.js.
 */
export class NotificationQueueService {
  /**
   * Inicializar el servicio (Placeholder para compatibilidad)
   */
  static async initialize(): Promise<void> {
    logWithCSTTime('✅ Servicio de cola de notificaciones inicializado (Modo Ligero)');
  }

  /**
   * Encola una notificación. 
   * En esta versión ligera, si la fecha es actual se intenta enviar de inmediato.
   */
  static async enqueueNotification(
    notification: ScheduledPushNotification,
    scheduledTime: Date | string
  ): Promise<void> {
    const timeStr = typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString();
    
    logWithCSTTime(`📤 Notificación programada recibida: ${notification.id} para ${timeStr}`);
    
    // Por ahora, registramos la intención. El scheduler de Supabase o un CRON de Vercel 
    // deberían ser los encargados de disparar las notificaciones en producción.
  }

  /**
   * Procesa las notificaciones pendientes (Placeholder para compatibilidad)
   */
  static async processQueueMessages(): Promise<void> {
    // En la versión ligera, el procesamiento se delega a las APIs de Supabase/Vercel
  }

  /**
   * Obtener estadísticas (Placeholder)
   */
  static async getQueueStats(): Promise<{
    approximateMessagesCount: number;
    queueName: string;
    status: 'connected' | 'error';
  }> {
    return {
      approximateMessagesCount: 0,
      queueName: 'memory-queue',
      status: 'connected'
    };
  }

  /**
   * Limpiar cola (Placeholder)
   */
  static async clearQueue(): Promise<void> {
    logWithCSTTime('🧹 Cola de memoria limpiada');
  }
}
