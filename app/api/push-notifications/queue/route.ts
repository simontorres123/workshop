import { NextRequest, NextResponse } from 'next/server';
import { NotificationQueueService } from '@/services/queue.service';

// POST /api/push-notifications/queue - Procesar queue de notificaciones
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando procesamiento de queue de notificaciones...');
    
    // Procesar mensajes pendientes en la queue
    await NotificationQueueService.processQueueMessages();
    
    // Obtener estadísticas de la queue
    const stats = await NotificationQueueService.getQueueStats();
    
    return NextResponse.json({
      success: true,
      message: 'Queue procesada exitosamente',
      data: {
        queueStats: stats,
        processedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error procesando queue:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error procesando queue de notificaciones',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/push-notifications/queue - Obtener estadísticas de la queue
export async function GET() {
  try {
    console.log('📊 Consultando estadísticas de queue...');
    
    const stats = await NotificationQueueService.getQueueStats();
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        lastCheck: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error consultando estadísticas de queue:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error consultando estadísticas de queue',
      data: {
        approximateMessagesCount: 0,
        queueName: 'notifications',
        status: 'error',
        lastCheck: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// DELETE /api/push-notifications/queue - Limpiar queue
export async function DELETE() {
  try {
    console.log('🧹 Limpiando queue de notificaciones...');
    
    await NotificationQueueService.clearQueue();
    
    return NextResponse.json({
      success: true,
      message: 'Queue limpiada exitosamente',
      clearedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error limpiando queue:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error limpiando queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}