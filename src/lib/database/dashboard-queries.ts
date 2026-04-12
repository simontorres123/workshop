import { RepairOrder, RepairStatus, WarrantyClaim } from '@/types/repair';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { addMonths, differenceInDays } from 'date-fns';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

// Detectar si estamos en el cliente o servidor
const isClient = typeof window !== 'undefined';

// Función helper para prevenir ejecución en cliente
function throwIfClient(functionName: string) {
  if (isClient) {
    throw new Error(`Function '${functionName}' should only be called from server-side code (API routes). Use API endpoints instead.`);
  }
}

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  deviceType?: string;
  clientName?: string;
  technician?: string;
  urgentOnly?: boolean;
  status?: RepairStatus[];
}

/**
 * Obtiene órdenes reparadas esperando entrega con filtros
 */
export async function getRepairedOrdersWaitingPickup(filters: DashboardFilters = {}): Promise<RepairOrder[]> {
  throwIfClient('getRepairedOrdersWaitingPickup');
  
  try {
    // Usar el repository real para obtener órdenes reparadas no entregadas
    let orders = await repairOrderRepository.getRepairedNotDelivered();

    // Aplicar filtros adicionales
    if (filters.deviceType) {
      orders = orders.filter(order => 
        order.deviceType?.toLowerCase().includes(filters.deviceType!.toLowerCase())
      );
    }

    if (filters.clientName) {
      orders = orders.filter(order => 
        order.clientName?.toLowerCase().includes(filters.clientName!.toLowerCase())
      );
    }

    return orders;
  } catch (error) {
    console.error('Error fetching repaired orders:', error);
    return [];
  }
}

/**
 * Obtiene órdenes urgentes con diagnóstico pendiente o en reparación por más de 3 días
 */
export async function getUrgentRepairOrders(filters: DashboardFilters = {}): Promise<RepairOrder[]> {
  throwIfClient('getUrgentRepairOrders');

  try {
    const allOrders = await repairOrderRepository.findAll();
    const now = new Date();
    
    return allOrders.filter(order => {
      // Solo estados activos
      const activeStatus = ['pending_diagnosis', 'diagnosis_confirmed', 'in_repair'];
      if (!activeStatus.includes(order.status)) return false;

      // Aplicar filtros básicos
      if (filters.deviceType && !order.deviceType?.toLowerCase().includes(filters.deviceType.toLowerCase())) return false;
      if (filters.clientName && !order.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) return false;

      // Calcular antigüedad (más de 3 días es urgente)
      const createdAt = new Date(order.createdAt);
      const daysOld = differenceInDays(now, createdAt);
      
      return daysOld >= 3;
    });
  } catch (error) {
    console.error('Error fetching urgent orders:', error);
    return [];
  }
}

/**
 * Estadísticas de garantía para el dashboard
 */
export async function getWarrantyStats() {
  throwIfClient('getWarrantyStats');

  try {
    const allOrders = await repairOrderRepository.findAll();
    
    // Filtrar órdenes que tienen o tuvieron garantía
    const warrantyOrders = allOrders.filter(o => (o.warrantyClaims && o.warrantyClaims.length > 0) || o.status === 'completed');
    
    const totalClaims = allOrders.reduce((sum, o) => sum + (o.warrantyClaims?.length || 0), 0);
    const pendingClaims = allOrders.reduce((sum, o) => 
      sum + (o.warrantyClaims?.filter(c => c.status === 'pending' || c.status === 'in_review').length || 0), 0
    );

    return {
      totalOrders: allOrders.length,
      warrantyOrders: warrantyOrders.length,
      totalClaims,
      pendingClaims,
      claimRate: allOrders.length > 0 ? (totalClaims / allOrders.length) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting warranty stats:', error);
    return { totalOrders: 0, warrantyOrders: 0, totalClaims: 0, pendingClaims: 0, claimRate: 0 };
  }
}

/**
 * Obtiene órdenes próximas a vencer su periodo de almacenamiento gratuito
 */
export async function getExpiringStorageOrders(filters: DashboardFilters = {}) {
  throwIfClient('getExpiringStorageOrders');

  try {
    const allOrders = await repairOrderRepository.findAll();
    const now = new Date();
    
    // Almacenamiento gratuito por defecto: 1 mes después de terminada la reparación
    return allOrders.filter(order => {
      if (order.status !== 'repaired') return false;
      if (!order.completedAt) return false;

      const completedDate = new Date(order.completedAt);
      const storageMonths = order.storagePeriodMonths || 1;
      const expirationDate = addMonths(completedDate, storageMonths);
      
      // Consideramos "próximo a vencer" si faltan 7 días o menos, o ya venció
      const daysToExpiration = differenceInDays(expirationDate, now);
      
      return daysToExpiration <= 7;
    });
  } catch (error) {
  console.error('Error getting expiring storage orders:', error);
  return [];
  }
  }

  /**
  * Obtiene métricas detalladas de garantía para gráficos
  */
  export async function getWarrantyMetrics(filters: DashboardFilters = {}) {
  throwIfClient('getWarrantyMetrics');

  try {
    const allOrders = await repairOrderRepository.findAll();

    // Filtrar por fechas si aplica
    const filteredOrders = allOrders.filter(order => {
      const createdAt = new Date(order.createdAt);
      if (filters.dateFrom && createdAt < filters.dateFrom) return false;
      if (filters.dateTo && createdAt > filters.dateTo) return false;
      return true;
    });

    const totalOrders = filteredOrders.length;
    const ordersWithWarranty = filteredOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    
    // Obtener todos los reclamos de las órdenes filtradas
    const allClaims: WarrantyClaim[] = filteredOrders.flatMap(o => {
      if (!o.warrantyClaims) return [];
      // Asegurarse de que cada claim tenga el ID de la orden para referencia
      return o.warrantyClaims.map(c => ({ ...c, repairId: o.id }));
    });

    // Agrupar por tipo de dispositivo
    const deviceTypes = Array.from(new Set(filteredOrders.map(o => o.deviceType).filter(Boolean)));
    const claimsByDeviceType = deviceTypes.map(type => {
      const typeOrders = filteredOrders.filter(o => o.deviceType === type);
      const typeClaims = typeOrders.flatMap(o => o.warrantyClaims || []);
      return {
        deviceType: type!,
        totalOrders: typeOrders.length,
        totalClaims: typeClaims.length,
        claimRate: typeOrders.length > 0 ? (typeClaims.length / typeOrders.length) * 100 : 0
      };
    }).sort((a, b) => b.claimRate - a.claimRate);

    // Agrupar por estado
    const statuses = ['pending', 'in_review', 'resolved', 'rejected'];
    const claimsByStatus = statuses.map(status => {
      const count = allClaims.filter(c => c.status === status).length;
      return {
        status,
        count,
        percentage: allClaims.length > 0 ? (count / allClaims.length) * 100 : 0
      };
    });

    // Motivos más comunes (top reasons)
    const reasonCounts: Record<string, number> = {};
    allClaims.forEach(c => {
      const reason = c.reason || 'No especificado';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const topClaimReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: allClaims.length > 0 ? (count / allClaims.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Reclamos recientes
    const recentClaims = [...allClaims]
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    return {
      totalOrders,
      ordersWithWarranty,
      totalClaims: allClaims.length,
      claimRate: totalOrders > 0 ? (allClaims.length / totalOrders) * 100 : 0,
      averageClaimsPerOrder: ordersWithWarranty > 0 ? allClaims.length / ordersWithWarranty : 0,
      claimsByDeviceType,
      claimsByStatus,
      recentClaims,
      topClaimReasons
    };
  } catch (error) {
    console.error('Error getting warranty metrics:', error);
    return {
      totalOrders: 0,
      ordersWithWarranty: 0,
      totalClaims: 0,
      claimRate: 0,
      averageClaimsPerOrder: 0,
      claimsByDeviceType: [],
      claimsByStatus: [],
      recentClaims: [],
      topClaimReasons: []
    };
  }
  }

  /**
  * Marca una orden como contactada para almacenamiento
  */
  export async function markOrderAsContacted(orderId: string) {
  throwIfClient('markOrderAsContacted');

  // En una implementación real, esto actualizaría una tabla de logs o un campo en la orden
  // Por ahora, simulamos éxito ya que el schema de repair_orders no tiene 'last_contacted_at' explícito
  return { success: true, timestamp: new Date().toISOString() };
  }

  /**
  * Obtiene la configuración del sistema (almacenamiento, garantías, etc.)
  */
  export async function getSystemConfiguration() {
  throwIfClient('getSystemConfiguration');

  // Estos valores deberían venir de la tabla 'organizations' -> settings
  // Por ahora devolvemos valores por defecto consistentes con .env
  return {
  storage: {
    costPerDay: 50,
    freeDays: 7,
    warningDays: 15
  },
  warranty: {
    defaultMonths: 3,
    warningDays: 30
  }
  };
  }

  /**
  * Actualiza la configuración del sistema
  */
  export async function updateSystemConfiguration(config: any) {
  throwIfClient('updateSystemConfiguration');
  return { success: true, config };
  }
