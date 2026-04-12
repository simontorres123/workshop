// @deprecated - Use ProductRepository instead of this legacy service
// This file is kept for compatibility but should not be used in new code
import { ProductRepository } from '@/repositories/product.repository';
import { Product } from '@/types';

const productRepository = new ProductRepository();

export const inventoryService = {
  async getProducts(filters = {}) {
    // Redirect to modern repository
    const result = await productRepository.findAll();
    return result.success ? result.data || [] : [];
  },

  async getProductById(id: string) {
    // Redirect to modern repository
    const result = await productRepository.findById(id);
    return result.success ? result.data : null;
  },

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    // Redirect to modern repository
    const result = await productRepository.create({
      ...productData,
      type: 'product',
    });
    return result.success ? result.data : null;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    // Redirect to modern repository
    const result = await productRepository.update(id, updates);
    return result.success ? result.data : null;
  },

  async deleteProduct(id: string) {
    // Redirect to modern repository
    await productRepository.delete(id);
  },

  async checkLowStock() {
    // This functionality should be implemented in the ProductRepository
    console.warn('Low stock check should be implemented in ProductRepository');
    return [];
  },
};