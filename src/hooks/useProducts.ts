"use client";

import { useState, useCallback } from 'react';
import { Product, CreateProductRequest, UpdateProductRequest, ProductSearchFilters } from '@/types/product';
import { useAuthStore } from '@/store/auth.store';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (filters?: ProductSearchFilters) => Promise<void>;
  createProduct: (data: CreateProductRequest) => Promise<Product | null>;
  updateProduct: (id: string, data: UpdateProductRequest) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateStock: (id: string, quantity: number, operation?: 'add' | 'subtract' | 'set') => Promise<boolean>;
  refreshProducts: () => Promise<void>;
  clearError: () => void;
}

export const useProducts = (): UseProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeBranchId } = useAuthStore();

  const fetchProducts = useCallback(async (filters?: ProductSearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.isActive !== undefined) params.set('isActive', filters.isActive.toString());
      if (filters?.inStock !== undefined) params.set('inStock', filters.inStock.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());

      // Añadir contexto de sucursal
      if (activeBranchId) {
        params.set('branchId', activeBranchId);
      }

      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data);
      } else {
        setError(result.error || 'Error cargando productos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (data: CreateProductRequest): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      // Inyectar branchId
      const payload = {
        ...data,
        branchId: (data as any).branchId || activeBranchId
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setProducts(prev => [result.data, ...prev]);
        return result.data;
      } else {
        setError(result.error || 'Error creando producto');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error creating product:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, data: UpdateProductRequest): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setProducts(prev => prev.map(product => 
          product.id === id ? result.data : product
        ));
        return result.data;
      } else {
        setError(result.error || 'Error actualizando producto');
        return null;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating product:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setProducts(prev => prev.filter(product => product.id !== id));
        return true;
      } else {
        setError(result.error || 'Error eliminando producto');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error deleting product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStock = useCallback(async (
    id: string, 
    quantity: number, 
    operation: 'add' | 'subtract' | 'set' = 'set'
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, operation }),
      });

      const result = await response.json();

      if (result.success) {
        setProducts(prev => prev.map(product => 
          product.id === id ? result.data : product
        ));
        return true;
      } else {
        setError(result.error || 'Error actualizando stock');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error updating stock:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refreshProducts,
    clearError,
  };
};