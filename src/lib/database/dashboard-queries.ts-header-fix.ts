import { RepairOrder, RepairStatus, WarrantyClaim } from '@/types/repair';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { addMonths, differenceInDays } from 'date-fns';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

// Detectar si estamos en el cliente o servidor
const isClient = typeof window !== 'undefined';

// Función helper para prevenir ejecución en cliente
function throwIfClient(functionName: string) {
  if (isClient) {
    throw new Error(`Function '${functionName}' should only be called from server-side code (API routes). Use API endpoints instead.`);
  }
}

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  deviceType?: string;
  clientName?: string;
  technician?: string;
  urgentOnly?: boolean;
  status?: RepairStatus[];
}
