// @deprecated - Use SaleRepository instead of this legacy service
// This file is kept for compatibility but should not be used in new code
import { SaleRepository } from '@/repositories/sales.repository';
import { ProductRepository } from '@/repositories/product.repository';
import { Sale } from '@/types';

const saleRepository = new SaleRepository();
const productRepository = new ProductRepository();

export const saleService = {
  async createSale(saleData: Omit<Sale, 'id' | 'transactionDate'>) {
    // Redirect to modern repository
    const result = await saleRepository.create({
      ...saleData,
      type: 'sale',
      transactionDate: new Date(),
    });

    if (result.success && result.data) {
      // Update stock using modern repository
      for (const item of saleData.items) {
        const productResult = await productRepository.findById(item.productId);
        if (productResult.success && productResult.data) {
          await productRepository.update(item.productId, {
            stock: productResult.data.stock - item.quantity,
          });
        }
      }
    }

    return result.success ? result.data : null;
  },

  async getSales(filters = {}) {
    // Redirect to modern repository
    const result = await saleRepository.findAll();
    return result.success ? result.data || [] : [];
  },
};