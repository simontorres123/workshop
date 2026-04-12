import { NextRequest, NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/cosmos/push-notifications';
import { NotificationQueueService } from '@/services/queue.service';
import { notificationScheduler } from '@/services/notification-scheduler.service';

// POST /api/push-notifications/initialize - Inicializar sistema de notificaciones
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Inicializando sistema de notificaciones push...');
    
    // Inicializar Azure Storage Queue
    await NotificationQueueService.initialize();
    console.log('📤 Queue de Azure Storage inicializado');
    
    // Procesar mensajes pendientes en la queue
    await NotificationQueueService.processQueueMessages();
    console.log('🔄 Mensajes de queue procesados');
    
    // Inicializar y arrancar el scheduler continuo
    await notificationScheduler.start();
    console.log('⏰ Scheduler continuo iniciado');
    
    // Obtener estadísticas de la queue
    const queueStats = await NotificationQueueService.getQueueStats();
    console.log('📊 Estadísticas de queue:', queueStats);
    
    // Obtener estado del scheduler
    const schedulerStatus = notificationScheduler.getStatus();
    console.log('📅 Estado del scheduler:', schedulerStatus);
    
    // Obtener todas las notificaciones activas desde la base de datos
    const activeNotifications = await PushNotificationService.getAllScheduledNotifications();
    console.log(`📋 Se encontraron ${activeNotifications.length} notificaciones activas en DB`);
    
    let programmedCount = 0;
    programmedCount = queueStats.approximateMessagesCount;
    
    console.log(`✅ Sistema de notificaciones inicializado: ${programmedCount} notificaciones programadas`);
    
    return NextResponse.json({
      success: true,
      message: 'Sistema de notificaciones inicializado correctamente',
      data: {
        totalNotifications: activeNotifications.length,
        queuedNotifications: programmedCount,
        queueStats,
        schedulerStatus,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error inicializando sistema de notificaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error inicializando sistema de notificaciones',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/push-notifications/initialize - Obtener estado del sistema
export async function GET() {
  try {
    console.log('📊 Consultando estado del sistema de notificaciones...');
    
    const stats = await PushNotificationService.getNotificationStats();
    const notifications = await PushNotificationService.getAllScheduledNotifications();
    const dueNotifications = await PushNotificationService.getNotificationsDueForExecution();
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        totalActive: notifications.length,
        dueForExecution: dueNotifications.length,
        systemStatus: 'running',
        lastCheck: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error consultando estado del sistema:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error consultando estado del sistema',
      data: {
        systemStatus: 'error',
        lastCheck: new Date().toISOString()
      }
    }, { status: 500 });
  }
}