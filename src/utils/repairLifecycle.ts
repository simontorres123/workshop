import { addMonths } from 'date-fns';
import { RepairOrder, RepairStatus } from '@/types/repair';

/** La garantía empieza cuando el aparato fue entregado al cliente. */
export function getWarrantyStartDate(order: RepairOrder): Date | null {
  if (!order.deliveredAt) return null;
  if (![RepairStatus.DELIVERED, RepairStatus.COMPLETED].includes(order.status as RepairStatus)) return null;
  return new Date(order.deliveredAt);
}

/** El almacenamiento empieza cuando queda reparado y termina al entregarlo. */
export function getStorageStartDate(order: RepairOrder): Date | null {
  if (!order.completedAt || order.deliveredAt || order.status !== RepairStatus.REPAIRED) return null;
  return new Date(order.completedAt);
}

export function getWarrantyExpirationDate(order: RepairOrder): Date | null {
  const start = getWarrantyStartDate(order);
  return start ? addMonths(start, order.warrantyPeriodMonths || 3) : null;
}

export function getStorageExpirationDate(order: RepairOrder): Date | null {
  const start = getStorageStartDate(order);
  return start ? addMonths(start, order.storagePeriodMonths || 1) : null;
}
