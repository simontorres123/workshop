import { useState, useCallback } from 'react';
import { WarrantyClaim } from '@/types/repair';

interface CreateWarrantyClaimData {
  reason: string;
  technician: string;
  notes?: string;
  resolution?: string;
  status?: 'pending' | 'in_review' | 'resolved' | 'rejected';
  clientSignature?: any;
  technicianSignature?: any;
  supervisorSignature?: any;
}

export function useWarrantyClaims(repairOrderId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWarrantyClaim = useCallback(async (claimData: CreateWarrantyClaimData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repair-orders/${repairOrderId}/warranty-claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error creando reclamo de garantía');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [repairOrderId]);

  const getWarrantyClaims = useCallback(async (): Promise<WarrantyClaim[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repair-orders/${repairOrderId}/warranty-claims`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo reclamos de garantía');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [repairOrderId]);

  return {
    createWarrantyClaim,
    getWarrantyClaims,
    loading,
    error,
    clearError: () => setError(null)
  };
}