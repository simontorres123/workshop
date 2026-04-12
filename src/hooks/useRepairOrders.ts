import { useState, useCallback } from 'react';
import { CreateRepairOrderRequest, RepairOrder, RepairOrderSearchFilters } from '@/types/repair';
import { useAuthStore } from '@/store/auth.store';

interface UseRepairOrdersResult {
  orders: RepairOrder[];
  loading: boolean;
  error: string | null;
  fetchOrders: (filters?: RepairOrderSearchFilters) => Promise<void>;
  createOrder: (data: CreateRepairOrderRequest) => Promise<RepairOrder>;
  updateOrder: (id: string, data: any) => Promise<RepairOrder>;
  updateOrderStatus: (id: string, status: string, note?: string) => Promise<RepairOrder>;
  deleteOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => Promise<RepairOrder | null>;
  refreshOrders: () => Promise<void>;
  updateOrderInList: (updatedOrder: RepairOrder) => void;
  clearError: () => void;
}

export function useRepairOrders(): UseRepairOrdersResult {
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeBranchId } = useAuthStore();

  const fetchOrders = useCallback(async (filters?: RepairOrderSearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (filters?.search) searchParams.append('search', filters.search);
      if (filters?.status) searchParams.append('status', filters.status);
      if (filters?.clientId) searchParams.append('clientId', filters.clientId);
      if (filters?.sortBy) searchParams.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) searchParams.append('sortOrder', filters.sortOrder);
      if (filters?.limit) searchParams.append('limit', filters.limit.toString());
      if (filters?.offset) searchParams.append('offset', filters.offset.toString());
      
      if (filters?.dateRange?.start) {
        searchParams.append('startDate', filters.dateRange.start.toISOString());
      }
      if (filters?.dateRange?.end) {
        searchParams.append('endDate', filters.dateRange.end.toISOString());
      }

      // Añadir contexto de sucursal si existe
      if (activeBranchId) {
        searchParams.append('branchId', activeBranchId);
      }

      const response = await fetch(`/api/repairs?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        console.log('Setting orders:', result.data);
        setOrders(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch orders');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching orders';
      setError(errorMessage);
      console.error('Error fetching repair orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (data: CreateRepairOrderRequest): Promise<RepairOrder> => {
    setLoading(true);
    setError(null);

    try {
      // Inyectar branchId si no viene en los datos y hay uno activo
      const payload = {
        ...data,
        branchId: (data as any).branchId || activeBranchId
      };

      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Agregar la nueva orden al estado local
        setOrders(prev => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrder = useCallback(async (id: string, data: any): Promise<RepairOrder> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repairs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Actualizar la orden en el estado local
        setOrders(prev => prev.map(order => 
          order.id === id ? result.data : order
        ));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    id: string, 
    status: string, 
    note?: string
  ): Promise<RepairOrder> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repairs/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, note }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Actualizar la orden en el estado local
        setOrders(prev => prev.map(order => 
          order.id === id ? result.data : order
        ));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating order status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrderById = useCallback(async (id: string): Promise<RepairOrder | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repairs/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error getting order';
      setError(errorMessage);
      console.error('Error getting repair order:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  const deleteOrder = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repairs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Remover la orden del estado local
        setOrders(prev => prev.filter(order => order.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderInList = useCallback((updatedOrder: RepairOrder) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getOrderById,
    refreshOrders,
    updateOrderInList,
    clearError
  };
}

// Hook específico para seguimiento público
export function usePublicTracking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackByFolio = useCallback(async (folio: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/track/${encodeURIComponent(folio.toUpperCase())}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No se encontró una reparación con ese folio');
        }
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Error al consultar el estado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al consultar el seguimiento';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    trackByFolio,
    loading,
    error,
    clearError
  };
}