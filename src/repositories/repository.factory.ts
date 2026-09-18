import { SupabaseClientRepository } from './supabase-client.repository';
import { SupabaseRepairOrderRepository, TenantContext } from './supabase-repair-order.repository';
import { SupabaseInventoryRepository } from './supabase-inventory.repository';
import { SupabaseSalesRepository } from './supabase-sales.repository';
import { SupabaseOrganizationRepository } from './supabase-organization.repository';
import { SupabaseBranchRepository } from './supabase-branch.repository';
import { SupabaseDeviceRepository } from './supabase-device.repository';

/**
 * RepositoryFactory centraliza el acceso a todos los repositorios de Supabase.
 */
export const RepositoryFactory = {
  getClients: (context?: { organizationId: string }) => {
    return new SupabaseClientRepository(context);
  },
  
  getRepairOrders: (context?: TenantContext) => {
    return new SupabaseRepairOrderRepository(context);
  },
  
  getInventory: () => {
    return new SupabaseInventoryRepository();
  },
  
  getSales: () => {
    return new SupabaseSalesRepository();
  },

  getOrganizations: () => {
    return new SupabaseOrganizationRepository();
  },

  getBranches: () => {
    return new SupabaseBranchRepository();
  },

  getDevices: () => new SupabaseDeviceRepository()
};
