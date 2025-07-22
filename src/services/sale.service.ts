import { Container } from '@azure/cosmos';
import { getContainer } from '@/lib/cosmosdb';
import { Sale } from '@/types';
import { COSMOS_DB_CONTAINERS } from '@/constants';
import { inventoryService } from './inventory.service';

let saleContainer: Container;

async function getSaleContainer() {
  if (!saleContainer) {
    saleContainer = await getContainer(COSMOS_DB_CONTAINERS.SALES);
  }
  return saleContainer;
}

export const saleService = {
  async createSale(saleData: Omit<Sale, '_id' | 'transactionDate'>) {
    const container = await getSaleContainer();
    const newSale = {
      ...saleData,
      transactionDate: new Date(),
    };
    const { resource: createdSale } = await container.items.create(newSale);

    // Actualizar stock
    for (const item of saleData.items) {
      const product = await inventoryService.getProductById(item.productId);
      if (product) {
        await inventoryService.updateProduct(item.productId, {
          stock: product.stock - item.quantity,
        });
      }
    }

    return createdSale;
  },

  async getSales(filters = {}) {
    const container = await getSaleContainer();
    const { resources: sales } = await container.items.readAll<Sale>().fetchAll();
    return sales;
  },
};
