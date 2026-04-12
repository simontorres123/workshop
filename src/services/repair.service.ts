// @deprecated - Use RepositoryFactory instead of this legacy service
import { RepositoryFactory } from '@/repositories/repository.factory';
import { RepairOrder } from '@/types/repair';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

export const repairService = {
  async createRepairOrder(orderData: Omit<RepairOrder, 'id' | 'folio' | 'createdAt' | 'updatedAt' | 'history'>) {
    // Redirect to modern repository
    return await repairOrderRepository.create({
      ...orderData,
      type: 'repair-order',
    });
  },

  async getRepairOrderByFolio(folio: string) {
    // Redirect to modern repository
    const result = await repairOrderRepository.findBy({ folio });
    return result.success && result.data ? result.data[0] : null;
  },

  async getRepairOrders(filters = {}) {
    // Redirect to modern repository
    const result = await repairOrderRepository.findAll();
    return result.success ? result.data || [] : [];
  },

  async updateRepairStatus(id: string, newStatus: RepairOrder['status'], notes: string) {
    // Redirect to modern repository
    const result = await repairOrderRepository.updateStatus(id, newStatus, notes);
    return result.success ? result.data : null;
  },

  async addOrUpdateRepairImage(id: string, imageFile: File) {
    // This functionality should be implemented using blob storage service
    console.warn('Image upload functionality should use blob storage service directly');
    return null;
  },
};