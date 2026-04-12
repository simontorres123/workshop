"use client";

import { useState, useEffect } from 'react';
import { Client, CreateClientRequest, UpdateClientRequest, ClientSearchFilters } from '@/types/client';

interface UseClientsResult {
  clients: Client[];
  loading: boolean;
  error: string | null;
  total: number;
  createClient: (data: CreateClientRequest) => Promise<Client | null>;
  updateClient: (id: string, data: UpdateClientRequest) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  searchClients: (filters: ClientSearchFilters) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useClients = (initialFilters?: ClientSearchFilters): UseClientsResult => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchClients = async (filters?: ClientSearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.set('search', filters.search);
      if (filters?.phone) params.set('phone', filters.phone);
      if (filters?.email) params.set('email', filters.email);
      if (filters?.hasEmail !== undefined) params.set('hasEmail', filters.hasEmail.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());

      const response = await fetch(`/api/clients?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setClients(result.data);
        setTotal(result.total);
      } else {
        setError(result.error || 'Error cargando clientes');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (data: CreateClientRequest): Promise<Client | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await fetchClients(initialFilters);
        return result.data;
      } else {
        setError(result.error || 'Error creando cliente');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error creating client:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id: string, data: UpdateClientRequest): Promise<Client | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await fetchClients(initialFilters);
        return result.data;
      } else {
        setError(result.error || 'Error actualizando cliente');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating client:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchClients(initialFilters);
        return true;
      } else {
        setError(result.error || 'Error eliminando cliente');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error deleting client:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (filters: ClientSearchFilters) => {
    await fetchClients(filters);
  };

  const refresh = async () => {
    await fetchClients(initialFilters);
  };

  useEffect(() => {
    fetchClients(initialFilters);
  }, []);

  return {
    clients,
    loading,
    error,
    total,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    refresh,
  };
};