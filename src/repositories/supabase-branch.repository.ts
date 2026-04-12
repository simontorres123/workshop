import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { useAuthStore } from '@/store/auth.store';

type DBBranch = Database['public']['Tables']['branches']['Row'];

export interface CreateBranchRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isMainBranch?: boolean;
}

export class SupabaseBranchRepository {
  /**
   * Listar sucursales de la organización actual
   */
  async findAll(): Promise<DBBranch[]> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching branches:', error);
      return [];
    }
  }

  /**
   * Crear nueva sucursal vinculada a la organización actual
   */
  async create(data: CreateBranchRequest): Promise<DBBranch | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) throw new Error('Usuario sin organización');

      const { data: newBranch, error } = await supabase
        .from('branches')
        .insert([{
          organization_id: orgId,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          is_main_branch: data.isMainBranch || false
        }])
        .select()
        .single();

      if (error) throw error;
      return newBranch;
    } catch (error) {
      console.error('Error creating branch:', error);
      return null;
    }
  }

  async findById(id: string): Promise<DBBranch | null> {
    const orgId = useAuthStore.getState().getOrganizationId();
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) return null;
    return data;
  }
}
