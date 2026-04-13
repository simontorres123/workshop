import { NextRequest, NextResponse } from 'next/server';
import { notificationScheduler } from '@/services/notification-scheduler.service';

// POST /api/push-notifications/scheduler - Controlar el scheduler
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'start':
        await notificationScheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Scheduler iniciado',
          status: notificationScheduler.getStatus()
        });

      case 'stop':
        notificationScheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler detenido',
          status: notificationScheduler.getStatus()
        });

      case 'process':
        await notificationScheduler.processNow();
        return NextResponse.json({
          success: true,
          message: 'Procesamiento manual ejecutado',
          status: notificationScheduler.getStatus()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida. Use: start, stop, o process'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error controlando scheduler:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error controlando scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/push-notifications/scheduler - Obtener estado del scheduler
export async function GET() {
  try {
    const status = notificationScheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        lastCheck: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error consultando estado del scheduler:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error consultando estado del scheduler',
      data: {
        isRunning: false,
        lastCheck: new Date().toISOString()
      }
    }, { status: 500 });
  }
}