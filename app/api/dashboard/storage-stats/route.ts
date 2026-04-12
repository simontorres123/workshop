import { NextRequest, NextResponse } from 'next/server';
import { RepairOrder, RepairStatus } from '@/types/repair';
import { calculateStorageAlerts } from '@/utils/storageAlerts';
import { getRepairedOrdersWaitingPickup, DashboardFilters } from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer filtros de los parámetros de consulta
    const filters: DashboardFilters = {
      deviceType: searchParams.get('deviceType') || undefined,
      clientName: searchParams.get('clientName') || undefined,
      urgentOnly: searchParams.get('urgentOnly') === 'true',
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
    };

    // Obtener órdenes reparadas esperando entrega
    const orders = await getRepairedOrdersWaitingPickup(filters);

    // Calcular estadísticas de almacenamiento
    const storageData = calculateStorageAlerts(orders);

    // Filtrar solo órdenes reparadas esperando entrega
    const repairedWaiting = orders.filter(order => 
      order.status === RepairStatus.REPAIRED && 
      order.completedAt && 
      !order.deliveredAt
    );

    // Calcular métricas adicionales
    const totalRepairedWaiting = repairedWaiting.length;
    const criticalAlerts = storageData.criticalAlertsCount;
    const totalStorageCost = storageData.totalStorageCost;
    const averageDaysInStorage = storageData.averageDaysInStorage;

    // Estadísticas por tipo de dispositivo
    const deviceTypeStats = new Map<string, { count: number; avgDays: number; totalCost: number }>();
    
    repairedWaiting.forEach(order => {
      const existing = deviceTypeStats.get(order.deviceType) || { count: 0, avgDays: 0, totalCost: 0 };
      existing.count++;
      
      if (order.completedAt) {
        const daysInStorage = Math.floor(
          (new Date().getTime() - new Date(order.completedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        existing.avgDays = (existing.avgDays * (existing.count - 1) + daysInStorage) / existing.count;
      }
      
      // Calcular costo usando la utilidad
      const alert = storageData.storageAlerts.find(a => a.id === order.id);
      if (alert?.estimatedCost) {
        existing.totalCost += alert.estimatedCost;
      }
      
      deviceTypeStats.set(order.deviceType, existing);
    });

    const stats = {
      totalRepairedWaiting,
      criticalAlerts,
      totalStorageCost,
      averageDaysInStorage,
      deviceTypeBreakdown: Array.from(deviceTypeStats.entries()).map(([type, data]) => ({
        deviceType: type,
        count: data.count,
        averageDays: Math.round(data.avgDays),
        totalCost: data.totalCost
      })),
      alerts: {
        critical: storageData.storageAlerts.filter(a => a.severity === 'critical').length,
        warning: storageData.storageAlerts.filter(a => a.severity === 'warning').length,
        total: storageData.totalAlertsCount
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching storage stats:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, orderId, costPerDay, freeDays } = body;

    // Aquí se podrían implementar acciones como:
    // - Actualizar configuración de costos
    // - Marcar orden como contactada
    // - Generar reporte de costos
    // - Enviar notificaciones

    switch (action) {
      case 'updateCostConfig':
        // Actualizar configuración de costos
        return NextResponse.json({
          success: true,
          message: 'Configuración de costos actualizada',
          data: { costPerDay, freeDays }
        });

      case 'markAsContacted':
        // Marcar orden como contactada
        return NextResponse.json({
          success: true,
          message: 'Orden marcada como contactada',
          data: { orderId, contactedAt: new Date().toISOString() }
        });

      case 'generateCostReport':
        // Generar reporte de costos
        return NextResponse.json({
          success: true,
          message: 'Reporte generado exitosamente',
          data: { reportId: `cost-report-${Date.now()}` }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing storage action:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error procesando la acción'
    }, { status: 500 });
  }
}