import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { warrantyNotificationService } from '@/services/warranty-notification.service';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

// GET /api/notifications/warranty-alerts - Obtener alertas de vencimiento
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') === 'true';

    // Obtener todas las órdenes
    const orders = await repairOrderRepository.findAll();
    
    if (dryRun) {
      // Modo de prueba: solo calcular qué notificaciones se enviarían
      const { calculateExpirationAlerts } = await import('@/utils/warrantyAlerts');
      const alerts = calculateExpirationAlerts(orders);
      
      return NextResponse.json({
        success: true,
        data: {
          totalAlerts: alerts.totalAlerts,
          criticalAlerts: alerts.criticalAlerts,
          warrantyAlerts: alerts.warrantyAlerts.length,
          storageAlerts: alerts.storageAlerts.length,
          alerts: [...alerts.warrantyAlerts, ...alerts.storageAlerts]
        },
        message: 'Vista previa de alertas (modo dry-run)'
      });
    }

    // Procesar y enviar notificaciones reales
    const result = await warrantyNotificationService.processExpirationNotifications(orders);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Procesamiento completado: ${result.sent} enviadas, ${result.failed} fallidas`
    });

  } catch (error) {
    console.error('Error processing warranty alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando alertas de garantía' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/warranty-alerts - Configurar notificaciones programadas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      scheduledDate, 
      preferences = {
        email: true,
        sms: false,
        whatsapp: false,
        inApp: true
      }
    } = body;

    if (!scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'scheduledDate es requerido' },
        { status: 400 }
      );
    }

    // Obtener todas las órdenes
    const orders = await repairOrderRepository.findAll();
    
    // Programar notificaciones
    await warrantyNotificationService.scheduleNotifications(
      orders,
      new Date(scheduledDate),
      preferences
    );

    return NextResponse.json({
      success: true,
      message: 'Notificaciones programadas exitosamente',
      data: {
        scheduledDate,
        preferences,
        ordersCount: orders.length
      }
    });

  } catch (error) {
    console.error('Error scheduling notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Error programando notificaciones' },
      { status: 500 }
    );
  }
}
