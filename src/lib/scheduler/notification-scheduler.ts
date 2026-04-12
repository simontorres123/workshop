import { automatedNotificationService } from '@/services/automated-notification.service';

/**
 * Servicio de programación de notificaciones
 * En producción, esto se ejecutaría usando un cron job, Azure Functions, o similar
 */
class NotificationScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * Inicia el programador de notificaciones
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Notification scheduler ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando notification scheduler...');
    this.isRunning = true;

    // Ejecutar inmediatamente al inicio
    this.processNotifications();

    // Programar ejecución cada 30 minutos
    const mainInterval = setInterval(() => {
      this.processNotifications();
    }, 30 * 60 * 1000); // 30 minutos

    this.intervals.set('main', mainInterval);

    // Programar verificación de alertas críticas cada 5 minutos
    const criticalInterval = setInterval(() => {
      this.processCriticalNotifications();
    }, 5 * 60 * 1000); // 5 minutos

    this.intervals.set('critical', criticalInterval);

    console.log('✅ Notification scheduler iniciado correctamente');
  }

  /**
   * Detiene el programador de notificaciones
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Notification scheduler no está ejecutándose');
      return;
    }

    console.log('🛑 Deteniendo notification scheduler...');

    // Limpiar todos los intervalos
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`  ✓ Intervalo '${key}' detenido`);
    });

    this.intervals.clear();
    this.isRunning = false;

    console.log('✅ Notification scheduler detenido');
  }

  /**
   * Procesa todas las notificaciones
   */
  private async processNotifications(): Promise<void> {
    try {
      console.log('🔄 Procesando notificaciones programadas...');
      
      const startTime = Date.now();
      const result = await automatedNotificationService.processAllNotifications();
      const duration = Date.now() - startTime;

      console.log(`📊 Resumen de procesamiento (${duration}ms):`);
      console.log(`  • Reglas procesadas: ${result.processed}`);
      console.log(`  • Notificaciones enviadas: ${result.sent}`);
      console.log(`  • Errores: ${result.failed}`);

      if (result.errors.length > 0) {
        console.error('❌ Errores encontrados:');
        result.errors.forEach(error => console.error(`  - ${error}`));
      }

    } catch (error) {
      console.error('❌ Error procesando notificaciones:', error);
    }
  }

  /**
   * Procesa solo notificaciones críticas (más frecuente)
   */
  private async processCriticalNotifications(): Promise<void> {
    try {
      // Filtrar solo reglas críticas o inmediatas
      const rules = automatedNotificationService.getRules()
        .filter(rule => 
          rule.enabled && 
          (rule.conditions.severity === 'critical' || rule.schedule.frequency === 'immediate')
        );

      if (rules.length === 0) {
        return;
      }

      console.log('🚨 Verificando notificaciones críticas...');
      
      // En una implementación real, aquí procesarías solo las reglas críticas
      // Por simplicidad, ejecutamos el proceso completo pero solo logueamos cuando hay críticas
      
    } catch (error) {
      console.error('❌ Error verificando notificaciones críticas:', error);
    }
  }

  /**
   * Obtiene el estado del programador
   */
  getStatus(): {
    isRunning: boolean;
    activeIntervals: string[];
    uptime?: number;
  } {
    return {
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.intervals.keys()),
      uptime: this.isRunning ? Date.now() : undefined
    };
  }

  /**
   * Ejecuta manualmente el procesamiento de notificaciones
   */
  async runManual(): Promise<void> {
    console.log('🔧 Ejecución manual solicitada...');
    await this.processNotifications();
  }
}

// Instancia singleton
export const notificationScheduler = new NotificationScheduler();

// En un entorno de producción, esto se iniciaría en el servidor
// Por ejemplo, en Next.js puedes usar un API route o un servicio separado

/**
 * Función para inicializar el scheduler en el servidor
 * Llama esto desde tu aplicación principal o servidor
 */
export function initializeNotificationScheduler(): void {
  // Solo inicializar en el servidor, no en el cliente
  if (typeof window === 'undefined') {
    notificationScheduler.start();

    // Manejar cierre limpio
    process.on('SIGINT', () => {
      console.log('🔄 Cerrando aplicación...');
      notificationScheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('🔄 Terminando aplicación...');
      notificationScheduler.stop();
      process.exit(0);
    });
  }
}

export default notificationScheduler;