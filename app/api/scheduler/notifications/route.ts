import { NextRequest, NextResponse } from 'next/server';
import { notificationScheduler } from '@/services/notification-scheduler.service';

// GET /api/scheduler/notifications - Obtener estado del scheduler
export async function GET() {
  try {
    const stats = notificationScheduler.getStats();
    const config = notificationScheduler.getConfig();
    const isActive = notificationScheduler.isActive();
    const validation = notificationScheduler.validateConfig();

    return NextResponse.json({
      success: true,
      data: {
        isActive,
        config,
        stats,
        validation
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo estado del scheduler' },
      { status: 500 }
    );
  }
}

// POST /api/scheduler/notifications - Configurar o controlar el scheduler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'start':
        notificationScheduler.initialize();
        return NextResponse.json({
          success: true,
          message: 'Scheduler iniciado exitosamente'
        });

      case 'stop':
        notificationScheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler detenido exitosamente'
        });

      case 'restart':
        notificationScheduler.restart();
        return NextResponse.json({
          success: true,
          message: 'Scheduler reiniciado exitosamente'
        });

      case 'run_manual':
        const result = await notificationScheduler.runManually();
        return NextResponse.json({
          success: true,
          data: result,
          message: `Ejecución manual completada: ${result.sent} enviadas, ${result.failed} fallidas`
        });

      case 'update_config':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Configuración requerida para actualizar' },
            { status: 400 }
          );
        }

        // Validar nueva configuración
        const tempScheduler = Object.create(notificationScheduler);
        tempScheduler.updateConfig(config);
        const validation = tempScheduler.validateConfig();

        if (!validation.valid) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Configuración inválida',
              details: validation.errors 
            },
            { status: 400 }
          );
        }

        notificationScheduler.updateConfig(config);
        
        return NextResponse.json({
          success: true,
          message: 'Configuración actualizada exitosamente',
          data: notificationScheduler.getConfig()
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing scheduler:', error);
    return NextResponse.json(
      { success: false, error: 'Error gestionando el scheduler' },
      { status: 500 }
    );
  }
}