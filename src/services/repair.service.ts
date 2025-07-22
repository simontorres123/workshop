import { Container } from '@azure/cosmos';
import { getContainer } from '@/lib/cosmosdb';
import { RepairOrder } from '@/types';
import { COSMOS_DB_CONTAINERS } from '@/constants';
import { storageService } from './storage.service'; // Dependerá del servicio de storage

let repairOrderContainer: Container;

async function getRepairOrderContainer() {
  if (!repairOrderContainer) {
    repairOrderContainer = await getContainer(COSMOS_DB_CONTAINERS.REPAIR_ORDERS);
  }
  return repairOrderContainer;
}

export const repairService = {
  async createRepairOrder(orderData: Omit<RepairOrder, '_id' | 'folio' | 'createdAt' | 'updatedAt' | 'history'>) {
    const container = await getRepairOrderContainer();
    // Lógica para generar folio único
    const folio = `RP-${Date.now()}`;
    const newOrder = {
      ...orderData,
      folio,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { resource: createdOrder } = await container.items.create(newOrder);
    return createdOrder;
  },

  async getRepairOrderByFolio(folio: string) {
    const container = await getRepairOrderContainer();
    const querySpec = {
      query: "SELECT * FROM c WHERE c.folio = @folio",
      parameters: [{ name: "@folio", value: folio }]
    };
    const { resources: orders } = await container.items.query<RepairOrder>(querySpec).fetchAll();
    return orders[0] || null;
  },

  async getRepairOrders(filters = {}) {
    const container = await getRepairOrderContainer();
    const { resources: orders } = await container.items.readAll<RepairOrder>().fetchAll();
    return orders;
  },

  async updateRepairStatus(id: string, newStatus: RepairOrder['status'], notes: string) {
    const container = await getRepairOrderContainer();
    const { resource: item } = await container.item(id, id).read<RepairOrder>();
    if (!item) throw new Error('Repair order not found');

    const newHistoryEntry = { status: newStatus, notes, updatedBy: 'admin', createdAt: new Date() };
    const updatedHistory = [...item.history, newHistoryEntry];

    const updatedItem = { ...item, status: newStatus, notesForClient: notes, history: updatedHistory, updatedAt: new Date() };
    const { resource: updatedOrder } = await container.item(id, id).replace(updatedItem);
    return updatedOrder;
  },

  async addOrUpdateRepairImage(id: string, imageFile: File) {
    // 1. Subir a Azure con storageService
    // 2. Actualizar la URL de la imagen en la orden de reparación
  },
};
