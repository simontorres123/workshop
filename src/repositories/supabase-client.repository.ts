import { supabase } from '@/lib/supabase/client';
import { Client, CreateClientRequest, UpdateClientRequest, ClientSearchFilters } from '@/types/client';
import { Database } from '@/types/supabase';
import { useAuthStore } from '@/store/auth.store';

type DBClient = Database['public']['Tables']['clients']['Row'];

export class SupabaseClientRepository {
  /**
   * Obtiene todos los clientes de la organización actual
   */
  async findAll(): Promise<Client[]> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return (data || []).map(db => this.mapToLocal(db));
    } catch (error) {
      console.error('Error getting all clients from Supabase:', error);
      return [];
    }
  }

  /**
   * Obtener cliente por ID
   */
  async findById(id: string): Promise<Client | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId) // Filtro de seguridad adicional
        .single();

      if (error) throw error;
      return data ? this.mapToLocal(data) : null;
    } catch (error) {
      console.error(`Error getting client ${id} from Supabase:`, error);
      return null;
    }
  }

  /**
   * Crear nuevo cliente vinculado a la organización actual
   */
  async create(data: CreateClientRequest): Promise<Client | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) throw new Error('Usuario sin organización asignada');

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([{
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          organization_id: orgId // Multi-tenant link
        }])
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocal(newClient);
    } catch (error) {
      console.error('Error creating client in Supabase:', error);
      return null;
    }
  }

  /**
   * Actualizar cliente
   */
  async update(id: string, data: UpdateClientRequest): Promise<Client | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return null;
      
      const updates: Partial<Database['public']['Tables']['clients']['Update']> = {};
      if (data.fullName) updates.full_name = data.fullName;
      if (data.phone) updates.phone = data.phone;
      if (data.email !== undefined) updates.email = data.email;
      if (data.address !== undefined) updates.address = data.address;
      if (data.notes !== undefined) updates.notes = data.notes;

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId) // Filtro de seguridad
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocal(updatedClient);
    } catch (error) {
      console.error(`Error updating client ${id} in Supabase:`, error);
      return null;
    }
  }

  /**
   * Eliminar cliente
   */
  async delete(id: string): Promise<boolean> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return false;
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting client ${id} from Supabase:`, error);
      return false;
    }
  }

  /**
   * Buscar con filtros restringido a la organización
   */
  async search(filters: ClientSearchFilters): Promise<Client[]> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return [];

      let query = supabase.from('clients').select('*').eq('organization_id', orgId);

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const sortCol = filters.sortBy === 'fullName' ? 'full_name' : 'created_at';
      query = query.order(sortCol, { ascending: filters.sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(db => this.mapToLocal(db));
    } catch (error) {
      console.error('Error searching clients in Supabase:', error);
      return [];
    }
  }

  private mapToLocal(db: DBClient): Client {
    return {
      id: db.id,
      type: 'client',
      fullName: db.full_name,
      phone: db.phone,
      email: db.email || undefined,
      address: db.address || undefined,
      notes: db.notes || undefined,
      createdAt: new Date(db.created_at || ''),
      updatedAt: new Date(db.updated_at || ''),
      createdBy: db.created_by || undefined
    };
  }
}
