import { Collection } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { Sale } from '@/types';
import { inventoryService } from './inventory.service';

let saleCollection: Collection<Sale>;

async function getSaleCollection() {
  if (!saleCollection) {
    const db = await getDb();
    saleCollection = db.collection<Sale>('sales');
  }
  return saleCollection;
}

export const saleService = {
  async createSale(saleData: Omit<Sale, '_id' | 'transactionDate'>) {
    const collection = await getSaleCollection();
    // Lógica para crear la venta
    // IMPORTANTE: Aquí se debe actualizar el stock de los productos vendidos
    // usando inventoryService.updateProduct
  },

  async getSales(filters = {}) {
    const collection = await getSaleCollection();
    // Lógica para obtener ventas con filtros (fecha, método de pago)
  },
};
