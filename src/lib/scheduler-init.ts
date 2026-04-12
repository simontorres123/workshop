import { notificationScheduler } from '@/services/notification-scheduler.service';

/**
 * Inicializa el scheduler de notificaciones al arrancar la aplicación
 * Solo se ejecuta en el servidor (no en el cliente)
 */
export function initializeScheduler(): void {
  // Solo inicializar en el servidor
  if (typeof window !== 'undefined') {
    return;
  }

  // Solo en producción o si está explícitamente habilitado
  const shouldInitialize = 
    process.env.NODE_ENV === 'production' || 
    process.env.ENABLE_SCHEDULER === 'true';

  if (!shouldInitialize) {
    console.log('📅 Scheduler initialization skipped (disabled in development)');
    return;
  }

  try {
    // Inicializar el scheduler (nuevo sistema con setInterval)
    notificationScheduler.start();
    
    console.log('✅ Notification Scheduler initialized successfully');
    console.log('📋 Using interval-based scheduler (every 60 seconds)');

  } catch (error) {
    console.error('❌ Failed to initialize Notification Scheduler:', error);
  }
}

/**
 * Limpia los recursos del scheduler al cerrar la aplicación
 */
export function cleanupScheduler(): void {
  if (typeof window !== 'undefined') {
    return;
  }

  try {
    notificationScheduler.stop();
    console.log('🛑 Notification Scheduler stopped gracefully');
  } catch (error) {
    console.error('❌ Error stopping Notification Scheduler:', error);
  }
}

function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

// Manejar cierre graceful de la aplicación
if (typeof process !== 'undefined') {
  process.on('SIGTERM', cleanupScheduler);
  process.on('SIGINT', cleanupScheduler);
  process.on('beforeExit', cleanupScheduler);
}