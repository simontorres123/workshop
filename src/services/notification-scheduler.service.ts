import { NotificationQueueService } from './queue.service';
import { logWithCSTTime } from '@/utils/timezone';

class NotificationSchedulerService {
  private static instance: NotificationSchedulerService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): NotificationSchedulerService {
    if (!NotificationSchedulerService.instance) {
      NotificationSchedulerService.instance = new NotificationSchedulerService();
    }
    return NotificationSchedulerService.instance;
  }

  /**
   * Iniciar el procesador continuo de notificaciones
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ El scheduler ya está ejecutándose');
      return;
    }

    try {
      logWithCSTTime('🚀 Iniciando procesador continuo de notificaciones...');

      // Inicializar el queue de Azure Storage
      await NotificationQueueService.initialize();

      // Crear un intervalo que se ejecute cada minuto (60,000 ms)
      this.intervalId = setInterval(async () => {
        await this.processNotifications();
      }, 60000); // 60 segundos

      this.isRunning = true;

      logWithCSTTime('✅ Procesador continuo iniciado - ejecutándose cada minuto');
      
      // Procesar inmediatamente al iniciar
      await this.processNotifications();

    } catch (error) {
      logWithCSTTime('❌ Error iniciando el scheduler:', error);
      throw error;
    }
  }

  /**
   * Detener el procesador continuo
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ El scheduler no está ejecutándose');
      return;
    }

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isRunning = false;
      console.log('🛑 Procesador continuo detenido');

    } catch (error) {
      console.error('❌ Error deteniendo el scheduler:', error);
    }
  }

  /**
   * Procesar notificaciones pendientes
   */
  private async processNotifications(): Promise<void> {
    try {
      logWithCSTTime('🔄 Procesando notificaciones pendientes...');

      // Procesar mensajes de la queue
      await NotificationQueueService.processQueueMessages();

      // Obtener estadísticas para logging
      const stats = await NotificationQueueService.getQueueStats();
      
      if (stats.approximateMessagesCount > 0) {
        logWithCSTTime('📊 Queue stats:', {
          messages: stats.approximateMessagesCount,
          status: stats.status
        });
      } else {
        logWithCSTTime('📭 No hay mensajes pendientes en la queue');
      }

    } catch (error) {
      console.error('❌ Error procesando notificaciones:', error);
    }
  }

  /**
   * Obtener el estado del scheduler
   */
  getStatus(): {
    isRunning: boolean;
    startedAt?: string;
    nextExecution?: string;
  } {
    const status = {
      isRunning: this.isRunning,
    };

    if (this.intervalId && this.isRunning) {
      // Calcular próxima ejecución para setInterval (cada minuto)
      const now = new Date();
      const nextMinute = new Date(now);
      nextMinute.setSeconds(0, 0);
      nextMinute.setMinutes(nextMinute.getMinutes() + 1);
      
      return {
        ...status,
        nextExecution: nextMinute.toISOString()
      };
    }

    return status;
  }

  /**
   * Procesar inmediatamente (para testing)
   */
  async processNow(): Promise<void> {
    console.log('🔄 Procesamiento manual solicitado...');
    await this.processNotifications();
  }
}

// Exportar singleton
export const notificationScheduler = NotificationSchedulerService.getInstance();

// No auto-inicializar para evitar problemas de configuración
// El scheduler se iniciará manualmente a través del endpoint de inicialización

export default notificationScheduler;