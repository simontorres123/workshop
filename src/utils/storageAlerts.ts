import { addMonths, differenceInDays, isAfter } from 'date-fns';
import { RepairOrder, RepairStatus } from '@/types/repair';

export interface StorageAlert {
  id: string;
  folio: string;
  type: 'storage';
  severity: 'warning' | 'critical';
  daysRemaining: number;
  expirationDate: Date;
  clientName: string;
  deviceType: string;
  message: string;
  completedAt: Date;
  estimatedCost?: number;
}

export interface StorageCalculationResult {
  storageAlerts: StorageAlert[];
  totalAlertsCount: number;
  criticalAlertsCount: number;
  repairedWaitingPickup: RepairOrder[];
  averageDaysInStorage: number;
  totalStorageCost: number;
}

/**
 * Calcula alertas de vencimiento de almacenamiento para aparatos reparados
 * @param orders - Array de órdenes de reparación
 * @param warningDays - Días antes del vencimiento para mostrar alerta (default: 15)
 * @param costPerDay - Costo diario de almacenamiento (default: 50)
 * @returns Objeto con alertas y estadísticas de almacenamiento
 */
export function calculateStorageAlerts(
  orders: RepairOrder[],
  warningDays: number = 15,
  costPerDay: number = 50
): StorageCalculationResult {
  const today = new Date();
  const storageAlerts: StorageAlert[] = [];

  // Filtrar solo órdenes que están reparadas pero no entregadas
  const repairedWaitingPickup = orders.filter(order => 
    order.status === RepairStatus.REPAIRED && 
    order.completedAt && 
    !order.deliveredAt
  );

  let totalDaysInStorage = 0;
  let totalStorageCost = 0;

  for (const order of repairedWaitingPickup) {
    if (!order.completedAt) continue;

    const completedDate = new Date(order.completedAt);
    const storagePeriod = order.storagePeriodMonths || 1; // Default 1 mes
    const storageExpirationDate = addMonths(completedDate, storagePeriod);
    
    // Calcular días en almacenamiento
    const daysInStorage = differenceInDays(today, completedDate);
    totalDaysInStorage += daysInStorage;
    
    // Calcular costo de almacenamiento actual
    const storageCost = Math.max(0, daysInStorage - 7) * costPerDay; // Primeros 7 días gratis
    totalStorageCost += storageCost;

    // Verificar si necesita alerta
    if (isAfter(storageExpirationDate, today)) {
      const daysToStorageExpiration = differenceInDays(storageExpirationDate, today);
      
      if (daysToStorageExpiration <= warningDays) {
        const severity: 'warning' | 'critical' = daysToStorageExpiration <= 3 ? 'critical' : 'warning';
        
        storageAlerts.push({
          id: order.id,
          folio: order.folio,
          type: 'storage',
          severity,
          daysRemaining: daysToStorageExpiration,
          expirationDate: storageExpirationDate,
          clientName: order.clientName,
          deviceType: order.deviceType,
          completedAt: completedDate,
          estimatedCost: storageCost,
          message: `${order.deviceType} (${order.folio}) debe ser recogido en ${daysToStorageExpiration} días. Costo actual: $${storageCost}`
        });
      }
    } else {
      // Ya expiró el período de almacenamiento gratuito
      const daysOverdue = differenceInDays(today, storageExpirationDate);
      const overdueStorageCost = daysOverdue * costPerDay;
      
      storageAlerts.push({
        id: order.id,
        folio: order.folio,
        type: 'storage',
        severity: 'critical',
        daysRemaining: -daysOverdue,
        expirationDate: storageExpirationDate,
        clientName: order.clientName,
        deviceType: order.deviceType,
        completedAt: completedDate,
        estimatedCost: storageCost + overdueStorageCost,
        message: `${order.deviceType} (${order.folio}) excedió el período de almacenamiento por ${daysOverdue} días. Costo total: $${storageCost + overdueStorageCost}`
      });
    }
  }

  // Ordenar por urgencia (más crítico primero)
  storageAlerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return Math.abs(a.daysRemaining) - Math.abs(b.daysRemaining);
  });

  const criticalAlertsCount = storageAlerts.filter(alert => alert.severity === 'critical').length;
  const averageDaysInStorage = repairedWaitingPickup.length > 0 
    ? Math.round(totalDaysInStorage / repairedWaitingPickup.length) 
    : 0;

  return {
    storageAlerts,
    totalAlertsCount: storageAlerts.length,
    criticalAlertsCount,
    repairedWaitingPickup,
    averageDaysInStorage,
    totalStorageCost
  };
}

/**
 * Calcula el costo de almacenamiento para una orden específica
 * @param order - Orden de reparación
 * @param costPerDay - Costo diario de almacenamiento
 * @param freeDays - Días gratuitos de almacenamiento (default: 7)
 * @returns Costo de almacenamiento actual
 */
export function calculateStorageCost(
  order: RepairOrder,
  costPerDay: number = 50,
  freeDays: number = 7
): number {
  if (!order.completedAt || order.deliveredAt) return 0;

  const today = new Date();
  const completedDate = new Date(order.completedAt);
  const daysInStorage = differenceInDays(today, completedDate);
  
  return Math.max(0, daysInStorage - freeDays) * costPerDay;
}

/**
 * Obtiene estadísticas de almacenamiento por tipo de dispositivo
 * @param orders - Array de órdenes de reparación
 * @returns Estadísticas agrupadas por tipo de dispositivo
 */
export function getStorageStatsByDeviceType(orders: RepairOrder[]) {
  const repairedWaiting = orders.filter(order => 
    order.status === RepairStatus.REPAIRED && 
    order.completedAt && 
    !order.deliveredAt
  );

  const stats = new Map<string, {
    count: number;
    totalDays: number;
    totalCost: number;
    oldestOrder: { folio: string; days: number };
  }>();

  const today = new Date();

  for (const order of repairedWaiting) {
    if (!order.completedAt) continue;

    const daysInStorage = differenceInDays(today, new Date(order.completedAt));
    const cost = calculateStorageCost(order);
    
    const existing = stats.get(order.deviceType) || {
      count: 0,
      totalDays: 0,
      totalCost: 0,
      oldestOrder: { folio: order.folio, days: daysInStorage }
    };

    existing.count++;
    existing.totalDays += daysInStorage;
    existing.totalCost += cost;

    if (daysInStorage > existing.oldestOrder.days) {
      existing.oldestOrder = { folio: order.folio, days: daysInStorage };
    }

    stats.set(order.deviceType, existing);
  }

  return Array.from(stats.entries()).map(([deviceType, data]) => ({
    deviceType,
    count: data.count,
    averageDays: Math.round(data.totalDays / data.count),
    totalCost: data.totalCost,
    oldestOrder: data.oldestOrder
  })).sort((a, b) => b.count - a.count);
}

/**
 * Filtra órdenes por proximidad de vencimiento de almacenamiento
 * @param orders - Array de órdenes
 * @param days - Días límite
 * @returns Órdenes que vencen en los próximos N días
 */
export function getOrdersExpiringInDays(orders: RepairOrder[], days: number): RepairOrder[] {
  const today = new Date();
  
  return orders.filter(order => {
    if (order.status !== RepairStatus.REPAIRED || !order.completedAt || order.deliveredAt) {
      return false;
    }

    const completedDate = new Date(order.completedAt);
    const storagePeriod = order.storagePeriodMonths || 1;
    const expirationDate = addMonths(completedDate, storagePeriod);
    const daysRemaining = differenceInDays(expirationDate, today);

    return daysRemaining >= 0 && daysRemaining <= days;
  });
}

/**
 * Obtiene el color y estilo apropiado para alertas de almacenamiento
 * @param severity - Severidad de la alerta
 * @param daysRemaining - Días restantes (puede ser negativo si ya expiró)
 * @returns Configuración de apariencia
 */
export function getStorageAlertAppearance(severity: 'warning' | 'critical', daysRemaining: number) {
  const isOverdue = daysRemaining < 0;
  
  return {
    icon: isOverdue ? 'eva:alert-triangle-fill' : 'eva:archive-outline',
    label: isOverdue ? 'Vencido' : 'Por vencer',
    color: severity === 'critical' ? 'error' : 'warning',
    bgcolor: severity === 'critical' ? 'error.lighter' : 'warning.lighter',
    priority: isOverdue ? 'urgent' : severity
  };
}