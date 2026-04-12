import { useState, useEffect, useCallback, useRef } from 'react';
import { RepairOrder, RepairStatus } from '@/types/repair';
import { calculateStorageAlerts, StorageCalculationResult } from '@/utils/storageAlerts';

interface UseRepairedOrdersResult {
  repairedOrders: RepairOrder[];
  storageData: StorageCalculationResult | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  getOrdersByDaysRemaining: (days: number) => RepairOrder[];
  getTotalStorageCost: () => number;
}

interface RepairedOrdersFilters {
  deviceType?: string;
  clientName?: string;
  daysInStorageMin?: number;
  daysInStorageMax?: number;
  sortBy?: 'completedAt' | 'folio' | 'clientName' | 'daysInStorage';
  sortOrder?: 'asc' | 'desc';
}

export function useRepairedOrders(filters: RepairedOrdersFilters = {}): UseRepairedOrdersResult {
  const [repairedOrders, setRepairedOrders] = useState<RepairOrder[]>([]);
  const [storageData, setStorageData] = useState<StorageCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchRepairedOrders = useCallback(async () => {
    // Evitar múltiples peticiones simultáneas
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Construir parámetros de consulta
      const searchParams = new URLSearchParams();
      searchParams.set('status', 'repaired'); // Usar el status real de tu sistema
      searchParams.set('excludeDelivered', 'true');

      if (filters.deviceType) {
        searchParams.set('deviceType', filters.deviceType);
      }
      if (filters.clientName) {
        searchParams.set('clientName', filters.clientName);
      }
      if (filters.sortBy) {
        searchParams.set('sortBy', filters.sortBy);
      }
      if (filters.sortOrder) {
        searchParams.set('sortOrder', filters.sortOrder);
      }

      const response = await fetch(`/api/repair-orders?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verificar que la respuesta sea JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('La respuesta del servidor no es JSON válido');
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error('Error al parsear la respuesta JSON del servidor');
      }

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo órdenes reparadas');
      }

      let orders = result.data || [];

      // Aplicar filtros adicionales
      orders = applyAdditionalFilters(orders, filters);

      // Calcular datos de almacenamiento
      const storage = calculateStorageAlerts(orders);

      setRepairedOrders(orders);
      setStorageData(storage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching repaired orders:', error);
      
      // En caso de error, establecer valores por defecto para evitar loops infinitos
      setRepairedOrders([]);
      setStorageData(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [
    filters.deviceType,
    filters.clientName, 
    filters.sortBy,
    filters.sortOrder,
    filters.daysInStorageMin,
    filters.daysInStorageMax
  ]);

  useEffect(() => {
    // Debounce para evitar demasiadas peticiones
    const timeoutId = setTimeout(() => {
      fetchRepairedOrders();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchRepairedOrders]);

  const getOrdersByDaysRemaining = useCallback((days: number): RepairOrder[] => {
    if (!storageData) return [];
    
    return storageData.storageAlerts
      .filter(alert => alert.daysRemaining <= days && alert.daysRemaining > 0)
      .map(alert => repairedOrders.find(order => order.id === alert.id))
      .filter((order): order is RepairOrder => order !== undefined);
  }, [repairedOrders, storageData]);

  const getTotalStorageCost = useCallback((): number => {
    return storageData?.totalStorageCost || 0;
  }, [storageData]);

  const refreshData = useCallback(async () => {
    await fetchRepairedOrders();
  }, [fetchRepairedOrders]);

  return {
    repairedOrders: storageData?.repairedWaitingPickup || [],
    storageData,
    loading,
    error,
    refreshData,
    getOrdersByDaysRemaining,
    getTotalStorageCost
  };
}

/**
 * Hook específico para obtener estadísticas rápidas de almacenamiento
 */
export function useStorageStats() {
  const [stats, setStats] = useState({
    totalRepairedWaiting: 0,
    criticalAlerts: 0,
    totalStorageCost: 0,
    averageDaysInStorage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/storage-stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching storage stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}

/**
 * Aplica filtros adicionales que no se pueden manejar en la API
 */
function applyAdditionalFilters(orders: RepairOrder[], filters: RepairedOrdersFilters): RepairOrder[] {
  let filtered = [...orders];

  // Filtrar solo órdenes reparadas no entregadas
  filtered = filtered.filter(order => 
    order.status === 'repaired' && 
    order.completedAt
  );

  // Filtrar por días en almacenamiento
  if (filters.daysInStorageMin !== undefined || filters.daysInStorageMax !== undefined) {
    const today = new Date();
    
    filtered = filtered.filter(order => {
      if (!order.completedAt) return false;
      
      const daysInStorage = Math.floor(
        (today.getTime() - new Date(order.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (filters.daysInStorageMin !== undefined && daysInStorage < filters.daysInStorageMin) {
        return false;
      }
      
      if (filters.daysInStorageMax !== undefined && daysInStorage > filters.daysInStorageMax) {
        return false;
      }
      
      return true;
    });
  }

  // Ordenamiento personalizado
  if (filters.sortBy === 'daysInStorage') {
    const today = new Date();
    filtered.sort((a, b) => {
      const daysA = a.completedAt ? Math.floor((today.getTime() - new Date(a.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const daysB = b.completedAt ? Math.floor((today.getTime() - new Date(b.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return filters.sortOrder === 'desc' ? daysB - daysA : daysA - daysB;
    });
  }

  return filtered;
}

/**
 * Hook para obtener órdenes agrupadas por estado de almacenamiento
 */
export function useStorageGroupedOrders() {
  const { repairedOrders, storageData, loading, error } = useRepairedOrders();

  const groupedOrders = {
    safe: repairedOrders.filter(order => {
      const alert = storageData?.storageAlerts.find(a => a.id === order.id);
      return !alert;
    }),
    warning: repairedOrders.filter(order => {
      const alert = storageData?.storageAlerts.find(a => a.id === order.id);
      return alert?.severity === 'warning';
    }),
    critical: repairedOrders.filter(order => {
      const alert = storageData?.storageAlerts.find(a => a.id === order.id);
      return alert?.severity === 'critical';
    })
  };

  return {
    groupedOrders,
    storageData,
    loading,
    error
  };
}