import { supabaseAdmin } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

type DBOrganization = Database['public']['Tables']['organizations']['Row'];

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  taxId?: string;
  logoUrl?: string;
}

export class SupabaseOrganizationRepository {
  /**
   * Listar todas las organizaciones (Solo Super Admin)
   */
  async findAll(): Promise<DBOrganization[]> {
    // Usamos supabaseAdmin para bypass de RLS ya que es una operación de Super Admin
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Crear una nueva organización
   */
  async create(data: CreateOrganizationRequest): Promise<DBOrganization | null> {
    const { data: newOrg, error } = await supabaseAdmin
      .from('organizations')
      .insert([{
        name: data.name,
        slug: data.slug.toLowerCase(),
        tax_id: data.taxId,
        logo_url: data.logoUrl
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating organization:', error);
      return null;
    }

    // Crear sucursal matriz por defecto
    const { error: branchError } = await supabaseAdmin.from('branches').insert([{
      organization_id: newOrg.id,
      name: 'Matriz',
      is_main_branch: true
    }]);

    if (branchError) {
      console.error('Error creating default branch:', branchError);
    }

    return newOrg;
  }

  async findById(id: string): Promise<DBOrganization | null> {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Actualizar una organización existente
   */
  async update(id: string, data: Partial<CreateOrganizationRequest> & { is_active?: boolean, subscription_plan?: string }): Promise<DBOrganization | null> {
    const { data: updatedOrg, error } = await supabaseAdmin
      .from('organizations')
      .update({
        name: data.name,
        slug: data.slug?.toLowerCase(),
        tax_id: data.taxId,
        logo_url: data.logoUrl,
        is_active: data.is_active,
        subscription_plan: data.subscription_plan
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      return null;
    }
    return updatedOrg;
  }

  /**
   * Cambiar el estado de activación de una organización
   */
  async toggleActive(id: string, active: boolean): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      console.error('Error toggling organization status:', error);
      return false;
    }
    return true;
  }
}
