import { RepairOrder, RepairStatus } from '@/types/repair';
import { calculateExpirationAlerts, WarrantyAlert } from './warrantyAlerts';
import { addMonths, differenceInDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WarrantyReport {
  id: string;
  title: string;
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
    description: string;
  };
  summary: {
    totalOrders: number;
    ordersWithWarranty: number;
    expiredWarranties: number;
    expiringSoon: number;
    activeClaims: number;
    averageWarrantyPeriod: number;
  };
  alerts: {
    critical: WarrantyAlert[];
    warning: WarrantyAlert[];
    total: number;
  };
  statistics: {
    byMonth: Array<{
      month: string;
      delivered: number;
      expired: number;
      claims: number;
    }>;
    byDeviceType: Array<{
      deviceType: string;
      count: number;
      averageWarrantyDays: number;
      claimsCount: number;
    }>;
    topClients: Array<{
      clientName: string;
      ordersCount: number;
      claimsCount: number;
      totalWarrantyValue: number;
    }>;
  };
  expiredOrders: Array<{
    folio: string;
    clientName: string;
    deviceType: string;
    deliveredAt: Date;
    warrantyExpiredAt: Date;
    daysExpired: number;
    hasActiveClaims: boolean;
  }>;
  expiringSoonOrders: Array<{
    folio: string;
    clientName: string;
    deviceType: string;
    deliveredAt: Date;
    warrantyExpiresAt: Date;
    daysRemaining: number;
  }>;
  recommendations: string[];
}

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  deviceTypes?: string[];
  clients?: string[];
  warrantyStatus?: 'all' | 'active' | 'expired' | 'expiring';
  includeClaims?: boolean;
}

/**
 * Genera un reporte completo de garantías
 */
export function generateWarrantyReport(
  orders: RepairOrder[], 
  filters: ReportFilters = {}
): WarrantyReport {
  const now = new Date();
  const reportId = `warranty-report-${now.getTime()}`;
  
  // Aplicar filtros
  const filteredOrders = applyFilters(orders, filters);
  
  // Filtrar solo órdenes entregadas con información de garantía
  const deliveredOrders = filteredOrders.filter(order => 
    order.status === RepairStatus.COMPLETED && 
    order.completedAt &&
    order.warrantyPeriodMonths
  );

  // Calcular alertas
  const alertsData = calculateExpirationAlerts(filteredOrders);
  
  // Período del reporte
  const period = calculateReportPeriod(filteredOrders, filters);
  
  // Estadísticas generales
  const summary = calculateSummaryStatistics(deliveredOrders, now);
  
  // Estadísticas detalladas
  const statistics = calculateDetailedStatistics(deliveredOrders);
  
  // Órdenes expiradas y por expirar
  const expiredOrders = findExpiredOrders(deliveredOrders, now);
  const expiringSoonOrders = findExpiringSoonOrders(deliveredOrders, now);
  
  // Recomendaciones
  const recommendations = generateRecommendations(
    summary, 
    alertsData, 
    expiredOrders, 
    expiringSoonOrders
  );

  return {
    id: reportId,
    title: `Reporte de Garantías - ${format(now, 'MMMM yyyy', { locale: es })}`,
    generatedAt: now,
    period,
    summary,
    alerts: {
      critical: alertsData.warrantyAlerts.filter(a => a.severity === 'critical'),
      warning: alertsData.warrantyAlerts.filter(a => a.severity === 'warning'),
      total: alertsData.warrantyAlerts.length
    },
    statistics,
    expiredOrders,
    expiringSoonOrders,
    recommendations
  };
}

/**
 * Aplica filtros a las órdenes
 */
function applyFilters(orders: RepairOrder[], filters: ReportFilters): RepairOrder[] {
  let filtered = [...orders];

  if (filters.dateFrom) {
    filtered = filtered.filter(order => 
      order.completedAt && new Date(order.completedAt) >= filters.dateFrom!
    );
  }

  if (filters.dateTo) {
    filtered = filtered.filter(order => 
      order.completedAt && new Date(order.completedAt) <= filters.dateTo!
    );
  }

  if (filters.deviceTypes && filters.deviceTypes.length > 0) {
    filtered = filtered.filter(order => 
      filters.deviceTypes!.includes(order.deviceType)
    );
  }

  if (filters.clients && filters.clients.length > 0) {
    filtered = filtered.filter(order => 
      filters.clients!.includes(order.clientName)
    );
  }

  if (filters.warrantyStatus && filters.warrantyStatus !== 'all') {
    const now = new Date();
    filtered = filtered.filter(order => {
      if (!order.completedAt || !order.warrantyPeriodMonths) return false;
      
      const warrantyExpiration = addMonths(new Date(order.completedAt), order.warrantyPeriodMonths);
      const daysRemaining = differenceInDays(warrantyExpiration, now);
      
      switch (filters.warrantyStatus) {
        case 'active':
          return daysRemaining > 0;
        case 'expired':
          return daysRemaining <= 0;
        case 'expiring':
          return daysRemaining > 0 && daysRemaining <= 30;
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Calcula el período del reporte
 */
function calculateReportPeriod(orders: RepairOrder[], filters: ReportFilters) {
  const now = new Date();
  
  if (filters.dateFrom && filters.dateTo) {
    return {
      from: filters.dateFrom,
      to: filters.dateTo,
      description: `${format(filters.dateFrom, 'dd/MM/yyyy')} - ${format(filters.dateTo, 'dd/MM/yyyy')}`
    };
  }
  
  // Período por defecto: último mes
  const from = startOfMonth(now);
  const to = endOfMonth(now);
  
  return {
    from,
    to,
    description: format(now, 'MMMM yyyy', { locale: es })
  };
}

/**
 * Calcula estadísticas de resumen
 */
function calculateSummaryStatistics(orders: RepairOrder[], now: Date) {
  const ordersWithWarranty = orders.filter(order => order.warrantyPeriodMonths);
  
  const expiredWarranties = ordersWithWarranty.filter(order => {
    const warrantyExpiration = addMonths(new Date(order.completedAt!), order.warrantyPeriodMonths!);
    return warrantyExpiration < now;
  }).length;
  
  const expiringSoon = ordersWithWarranty.filter(order => {
    const warrantyExpiration = addMonths(new Date(order.completedAt!), order.warrantyPeriodMonths!);
    const daysRemaining = differenceInDays(warrantyExpiration, now);
    return daysRemaining > 0 && daysRemaining <= 30;
  }).length;
  
  const activeClaims = ordersWithWarranty.reduce((total, order) => 
    total + (order.warrantyClaims?.length || 0), 0
  );
  
  const averageWarrantyPeriod = ordersWithWarranty.length > 0
    ? ordersWithWarranty.reduce((sum, order) => sum + (order.warrantyPeriodMonths || 0), 0) / ordersWithWarranty.length
    : 0;

  return {
    totalOrders: orders.length,
    ordersWithWarranty: ordersWithWarranty.length,
    expiredWarranties,
    expiringSoon,
    activeClaims,
    averageWarrantyPeriod: Math.round(averageWarrantyPeriod * 10) / 10
  };
}

/**
 * Calcula estadísticas detalladas
 */
function calculateDetailedStatistics(orders: RepairOrder[]) {
  // Por mes
  const monthlyStats = new Map<string, { delivered: number; expired: number; claims: number }>();
  const now = new Date();
  
  orders.forEach(order => {
    if (!order.completedAt) return;
    
    const monthKey = format(new Date(order.completedAt), 'yyyy-MM');
    const existing = monthlyStats.get(monthKey) || { delivered: 0, expired: 0, claims: 0 };
    
    existing.delivered++;
    
    if (order.warrantyPeriodMonths) {
      const warrantyExpiration = addMonths(new Date(order.completedAt), order.warrantyPeriodMonths);
      if (warrantyExpiration < now) {
        existing.expired++;
      }
    }
    
    existing.claims += order.warrantyClaims?.length || 0;
    monthlyStats.set(monthKey, existing);
  });

  // Por tipo de dispositivo
  const deviceStats = new Map<string, { count: number; totalWarrantyDays: number; claimsCount: number }>();
  
  orders.forEach(order => {
    const existing = deviceStats.get(order.deviceType) || { count: 0, totalWarrantyDays: 0, claimsCount: 0 };
    existing.count++;
    existing.totalWarrantyDays += (order.warrantyPeriodMonths || 0) * 30; // Aproximar días
    existing.claimsCount += order.warrantyClaims?.length || 0;
    deviceStats.set(order.deviceType, existing);
  });

  // Por cliente
  const clientStats = new Map<string, { ordersCount: number; claimsCount: number; totalWarrantyValue: number }>();
  
  orders.forEach(order => {
    const existing = clientStats.get(order.clientName) || { ordersCount: 0, claimsCount: 0, totalWarrantyValue: 0 };
    existing.ordersCount++;
    existing.claimsCount += order.warrantyClaims?.length || 0;
    existing.totalWarrantyValue += order.totalCost || 0;
    clientStats.set(order.clientName, existing);
  });

  return {
    byMonth: Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: es }),
        ...stats
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    
    byDeviceType: Array.from(deviceStats.entries())
      .map(([deviceType, stats]) => ({
        deviceType,
        count: stats.count,
        averageWarrantyDays: Math.round(stats.totalWarrantyDays / stats.count),
        claimsCount: stats.claimsCount
      }))
      .sort((a, b) => b.count - a.count),
    
    topClients: Array.from(clientStats.entries())
      .map(([clientName, stats]) => ({ clientName, ...stats }))
      .sort((a, b) => b.ordersCount - a.ordersCount)
      .slice(0, 10)
  };
}

/**
 * Encuentra órdenes con garantías expiradas
 */
function findExpiredOrders(orders: RepairOrder[], now: Date) {
  return orders
    .filter(order => {
      if (!order.completedAt || !order.warrantyPeriodMonths) return false;
      const warrantyExpiration = addMonths(new Date(order.completedAt), order.warrantyPeriodMonths);
      return warrantyExpiration < now;
    })
    .map(order => {
      const deliveredAt = new Date(order.completedAt!);
      const warrantyExpiredAt = addMonths(deliveredAt, order.warrantyPeriodMonths!);
      const daysExpired = differenceInDays(now, warrantyExpiredAt);
      
      return {
        folio: order.folio,
        clientName: order.clientName,
        deviceType: order.deviceType,
        deliveredAt,
        warrantyExpiredAt,
        daysExpired,
        hasActiveClaims: (order.warrantyClaims?.length || 0) > 0
      };
    })
    .sort((a, b) => b.daysExpired - a.daysExpired);
}

/**
 * Encuentra órdenes con garantías por expirar pronto
 */
function findExpiringSoonOrders(orders: RepairOrder[], now: Date) {
  return orders
    .filter(order => {
      if (!order.completedAt || !order.warrantyPeriodMonths) return false;
      const warrantyExpiration = addMonths(new Date(order.completedAt), order.warrantyPeriodMonths);
      const daysRemaining = differenceInDays(warrantyExpiration, now);
      return daysRemaining > 0 && daysRemaining <= 30;
    })
    .map(order => {
      const deliveredAt = new Date(order.completedAt!);
      const warrantyExpiresAt = addMonths(deliveredAt, order.warrantyPeriodMonths!);
      const daysRemaining = differenceInDays(warrantyExpiresAt, now);
      
      return {
        folio: order.folio,
        clientName: order.clientName,
        deviceType: order.deviceType,
        deliveredAt,
        warrantyExpiresAt,
        daysRemaining
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Genera recomendaciones basadas en los datos del reporte
 */
function generateRecommendations(
  summary: any,
  alertsData: any,
  expiredOrders: any[],
  expiringSoonOrders: any[]
): string[] {
  const recommendations: string[] = [];

  // Recomendaciones basadas en garantías expiradas
  if (summary.expiredWarranties > 0) {
    recommendations.push(
      `Se detectaron ${summary.expiredWarranties} garantías expiradas. Considera contactar a estos clientes para ofrecer servicios adicionales.`
    );
  }

  // Recomendaciones basadas en alertas críticas
  if (alertsData.criticalAlerts > 0) {
    recommendations.push(
      `Hay ${alertsData.criticalAlerts} alertas críticas de garantía. Es urgente contactar a estos clientes antes de que expire la garantía.`
    );
  }

  // Recomendaciones basadas en reclamos
  if (summary.activeClaims > 0) {
    const claimRate = (summary.activeClaims / summary.ordersWithWarranty) * 100;
    if (claimRate > 10) {
      recommendations.push(
        `La tasa de reclamos de garantía es alta (${claimRate.toFixed(1)}%). Revisa la calidad de las reparaciones.`
      );
    }
  }

  // Recomendaciones basadas en período de garantía promedio
  if (summary.averageWarrantyPeriod < 3) {
    recommendations.push(
      `El período promedio de garantía es bajo (${summary.averageWarrantyPeriod} meses). Considera ofrecer garantías más largas para mejorar la confianza del cliente.`
    );
  }

  // Recomendación de seguimiento
  if (expiringSoonOrders.length > 0) {
    recommendations.push(
      `${expiringSoonOrders.length} garantías expiran en los próximos 30 días. Programa recordatorios para contactar a estos clientes.`
    );
  }

  // Si no hay problemas, dar recomendaciones generales
  if (recommendations.length === 0) {
    recommendations.push(
      'El estado de las garantías es saludable. Mantén un seguimiento regular para identificar oportunidades de mejora.',
      'Considera implementar un programa de fidelización para clientes con múltiples servicios.'
    );
  }

  return recommendations;
}

/**
 * Exporta el reporte a diferentes formatos
 */
export function exportWarrantyReport(report: WarrantyReport, format: 'json' | 'csv' | 'text'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    
    case 'csv':
      return generateCSVReport(report);
    
    case 'text':
      return generateTextReport(report);
    
    default:
      throw new Error('Formato no soportado');
  }
}

/**
 * Genera reporte en formato CSV
 */
function generateCSVReport(report: WarrantyReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`"Reporte de Garantías","${report.title}"`);
  lines.push(`"Generado","${format(report.generatedAt, 'dd/MM/yyyy HH:mm')}"`);
  lines.push('');
  
  // Resumen
  lines.push('"RESUMEN"');
  lines.push(`"Total de órdenes","${report.summary.totalOrders}"`);
  lines.push(`"Órdenes con garantía","${report.summary.ordersWithWarranty}"`);
  lines.push(`"Garantías expiradas","${report.summary.expiredWarranties}"`);
  lines.push(`"Expiran pronto","${report.summary.expiringSoon}"`);
  lines.push('');
  
  // Órdenes expiradas
  if (report.expiredOrders.length > 0) {
    lines.push('"ÓRDENES CON GARANTÍA EXPIRADA"');
    lines.push('"Folio","Cliente","Dispositivo","Entregado","Expiró","Días Vencido"');
    report.expiredOrders.forEach(order => {
      lines.push(`"${order.folio}","${order.clientName}","${order.deviceType}","${format(order.deliveredAt, 'dd/MM/yyyy')}","${format(order.warrantyExpiredAt, 'dd/MM/yyyy')}","${order.daysExpired}"`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Genera reporte en formato texto
 */
function generateTextReport(report: WarrantyReport): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push(`  ${report.title.toUpperCase()}`);
  lines.push('='.repeat(60));
  lines.push(`Generado: ${format(report.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}`);
  lines.push(`Período: ${report.period.description}`);
  lines.push('');
  
  // Resumen
  lines.push('RESUMEN EJECUTIVO');
  lines.push('-'.repeat(20));
  lines.push(`• Total de órdenes: ${report.summary.totalOrders}`);
  lines.push(`• Órdenes con garantía: ${report.summary.ordersWithWarranty}`);
  lines.push(`• Garantías expiradas: ${report.summary.expiredWarranties}`);
  lines.push(`• Expiran en 30 días: ${report.summary.expiringSoon}`);
  lines.push(`• Reclamos activos: ${report.summary.activeClaims}`);
  lines.push(`• Período promedio: ${report.summary.averageWarrantyPeriod} meses`);
  lines.push('');
  
  // Alertas
  if (report.alerts.total > 0) {
    lines.push('ALERTAS ACTIVAS');
    lines.push('-'.repeat(15));
    lines.push(`• Críticas: ${report.alerts.critical.length}`);
    lines.push(`• Advertencias: ${report.alerts.warning.length}`);
    lines.push('');
  }
  
  // Recomendaciones
  if (report.recommendations.length > 0) {
    lines.push('RECOMENDACIONES');
    lines.push('-'.repeat(15));
    report.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`);
    });
  }
  
  return lines.join('\n');
}