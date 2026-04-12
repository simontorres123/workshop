import { NextRequest, NextResponse } from 'next/server';
import { automatedNotificationService } from '@/services/automated-notification.service';
import { notificationScheduler } from '@/lib/scheduler/notification-scheduler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, immediate = false } = body;

    switch (action) {
      case 'process':
        // Procesar todas las notificaciones
        const result = await automatedNotificationService.processAllNotifications();
        
        return NextResponse.json({
          success: true,
          message: 'Notificaciones procesadas exitosamente',
          data: result
        });

      case 'start_scheduler':
        // Iniciar el programador automático
        notificationScheduler.start();
        
        return NextResponse.json({
          success: true,
          message: 'Programador de notificaciones iniciado',
          data: notificationScheduler.getStatus()
        });

      case 'stop_scheduler':
        // Detener el programador
        notificationScheduler.stop();
        
        return NextResponse.json({
          success: true,
          message: 'Programador de notificaciones detenido',
          data: notificationScheduler.getStatus()
        });

      case 'status':
        // Obtener estado del programador
        return NextResponse.json({
          success: true,
          data: notificationScheduler.getStatus()
        });

      case 'manual_run':
        // Ejecutar manualmente
        await notificationScheduler.runManual();
        
        return NextResponse.json({
          success: true,
          message: 'Ejecución manual completada'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing notifications:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener estado y configuración de notificaciones
    const rules = automatedNotificationService.getRules();
    const schedulerStatus = notificationScheduler.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        rules: rules.map(rule => ({
          ...rule,
          // No incluir información sensible en la respuesta
          lastRun: rule.lastRun?.toISOString(),
          nextRun: rule.nextRun?.toISOString()
        })),
        summary: {
          totalRules: rules.length,
          activeRules: rules.filter(r => r.enabled).length,
          schedulerRunning: schedulerStatus.isRunning
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notification status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado de notificaciones'
    }, { status: 500 });
  }
}