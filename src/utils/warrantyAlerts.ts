import { addMonths, differenceInDays, isAfter, isBefore } from 'date-fns';
import { RepairOrder, RepairStatus } from '@/types/repair';

export interface WarrantyAlert {
  id: string;
  folio: string;
  type: 'warranty' | 'storage';
  severity: 'warning' | 'critical';
  daysRemaining: number;
  expirationDate: Date;
  clientName: string;
  deviceType: string;
  message: string;
}

export interface AlertsCalculationResult {
  warrantyAlerts: WarrantyAlert[];
  storageAlerts: WarrantyAlert[];
  totalAlerts: number;
  criticalAlerts: number;
}

/**
 * Calcula las alertas de vencimiento de garantía y almacenamiento
 * @param orders - Array de órdenes de reparación
 * @param warningDays - Días antes del vencimiento para mostrar alerta (default: 30)
 * @returns Objeto con las alertas organizadas por tipo
 */
export function calculateExpirationAlerts(
  orders: RepairOrder[],
  warningDays: number = 30
): AlertsCalculationResult {
  const today = new Date();
  const warrantyAlerts: WarrantyAlert[] = [];
  const storageAlerts: WarrantyAlert[] = [];

  // Filtrar solo órdenes que están entregadas (tienen deliveredAt)
  const deliveredOrders = orders.filter(order => 
    order.deliveredAt && 
    order.status === RepairStatus.DELIVERED
  );

  for (const order of deliveredOrders) {
    if (!order.deliveredAt) continue;

    const deliveryDate = new Date(order.deliveredAt);
    const warrantyPeriod = order.warrantyPeriodMonths || 3; // Default 3 meses
    const storagePeriod = order.storagePeriodMonths || 1; // Default 1 mes

    // Calcular fechas de vencimiento
    const warrantyExpirationDate = addMonths(deliveryDate, warrantyPeriod);
    const storageExpirationDate = addMonths(deliveryDate, storagePeriod);

    // Verificar alerta de garantía
    if (isAfter(warrantyExpirationDate, today)) {
      const daysToWarrantyExpiration = differenceInDays(warrantyExpirationDate, today);
      
      if (daysToWarrantyExpiration <= warningDays) {
        const severity: 'warning' | 'critical' = daysToWarrantyExpiration <= 7 ? 'critical' : 'warning';
        
        warrantyAlerts.push({
          id: order.id,
          folio: order.folio,
          type: 'warranty',
          severity,
          daysRemaining: daysToWarrantyExpiration,
          expirationDate: warrantyExpirationDate,
          clientName: order.clientName,
          deviceType: order.deviceType,
          message: `La garantía de ${order.deviceType} (${order.folio}) vence en ${daysToWarrantyExpiration} días`
        });
      }
    }

    // Verificar alerta de almacenamiento
    if (isAfter(storageExpirationDate, today)) {
      const daysToStorageExpiration = differenceInDays(storageExpirationDate, today);
      
      if (daysToStorageExpiration <= warningDays) {
        const severity: 'warning' | 'critical' = daysToStorageExpiration <= 7 ? 'critical' : 'warning';
        
        storageAlerts.push({
          id: order.id,
          folio: order.folio,
          type: 'storage',
          severity,
          daysRemaining: daysToStorageExpiration,
          expirationDate: storageExpirationDate,
          clientName: order.clientName,
          deviceType: order.deviceType,
          message: `El almacenamiento de ${order.deviceType} (${order.folio}) vence en ${daysToStorageExpiration} días`
        });
      }
    }
  }

  // Ordenar por días restantes (más urgente primero)
  warrantyAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  storageAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const totalAlerts = warrantyAlerts.length + storageAlerts.length;
  const criticalAlerts = [...warrantyAlerts, ...storageAlerts]
    .filter(alert => alert.severity === 'critical').length;

  return {
    warrantyAlerts,
    storageAlerts,
    totalAlerts,
    criticalAlerts
  };
}

/**
 * Verifica si una orden específica tiene alertas de vencimiento
 * @param order - Orden de reparación
 * @param warningDays - Días antes del vencimiento para considerar alerta
 * @returns Objeto con información de alertas para la orden
 */
export function checkOrderAlerts(
  order: RepairOrder,
  warningDays: number = 30
): {
  hasWarrantyAlert: boolean;
  hasStorageAlert: boolean;
  warrantyDaysRemaining?: number;
  storageDaysRemaining?: number;
  warrantyExpirationDate?: Date;
  storageExpirationDate?: Date;
} {
  if (!order.deliveredAt || order.status !== RepairStatus.DELIVERED) {
    return {
      hasWarrantyAlert: false,
      hasStorageAlert: false
    };
  }

  const today = new Date();
  const deliveryDate = new Date(order.deliveredAt);
  const warrantyPeriod = order.warrantyPeriodMonths || 3;
  const storagePeriod = order.storagePeriodMonths || 1;

  const warrantyExpirationDate = addMonths(deliveryDate, warrantyPeriod);
  const storageExpirationDate = addMonths(deliveryDate, storagePeriod);

  const warrantyDaysRemaining = differenceInDays(warrantyExpirationDate, today);
  const storageDaysRemaining = differenceInDays(storageExpirationDate, today);

  return {
    hasWarrantyAlert: warrantyDaysRemaining <= warningDays && warrantyDaysRemaining > 0,
    hasStorageAlert: storageDaysRemaining <= warningDays && storageDaysRemaining > 0,
    warrantyDaysRemaining: warrantyDaysRemaining > 0 ? warrantyDaysRemaining : undefined,
    storageDaysRemaining: storageDaysRemaining > 0 ? storageDaysRemaining : undefined,
    warrantyExpirationDate,
    storageExpirationDate
  };
}

/**
 * Obtiene el color y icono apropiado para el tipo y severidad de alerta
 * @param type - Tipo de alerta
 * @param severity - Severidad de la alerta
 * @returns Objeto con color e icono
 */
export function getAlertAppearance(type: 'warranty' | 'storage', severity: 'warning' | 'critical') {
  const baseConfig = {
    warranty: {
      icon: 'eva:shield-outline',
      label: 'Garantía'
    },
    storage: {
      icon: 'eva:archive-outline',
      label: 'Almacenamiento'
    }
  };

  const severityColors = {
    warning: {
      color: 'warning' as const,
      bgcolor: 'warning.lighter'
    },
    critical: {
      color: 'error' as const,
      bgcolor: 'error.lighter'
    }
  };

  return {
    ...baseConfig[type],
    ...severityColors[severity]
  };
}

/**
 * Filtra alertas por severidad
 * @param alerts - Array de alertas
 * @param severity - Severidad a filtrar
 * @returns Array filtrado de alertas
 */
export function filterAlertsBySeverity(
  alerts: WarrantyAlert[],
  severity: 'warning' | 'critical'
): WarrantyAlert[] {
  return alerts.filter(alert => alert.severity === severity);
}

/**
 * Agrupa alertas por cliente
 * @param alerts - Array de alertas
 * @returns Mapa con alertas agrupadas por cliente
 */
export function groupAlertsByClient(
  alerts: WarrantyAlert[]
): Map<string, WarrantyAlert[]> {
  const grouped = new Map<string, WarrantyAlert[]>();
  
  for (const alert of alerts) {
    const clientAlerts = grouped.get(alert.clientName) || [];
    clientAlerts.push(alert);
    grouped.set(alert.clientName, clientAlerts);
  }
  
  return grouped;
}