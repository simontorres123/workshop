import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserRole = Database['public']['Enums']['user_role'];

export const userService = {
  /**
   * Obtener todos los usuarios de la organización actual
   */
  getOrganizationUsers: async (organizationId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, branches(name)')
      .eq('organization_id', organizationId)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  /**
   * Obtener usuarios de una sucursal específica
   */
  getBranchUsers: async (branchId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, branches(name)')
      .eq('branch_id', branchId)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar el rol o sucursal de un usuario
   */
  updateUser: async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Invitar a un nuevo miembro del equipo (Crea el usuario en Auth y Perfil)
   */
  inviteTeamMember: async (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    organizationId: string;
    branchId?: string | null;
  }) => {
    const response = await fetch('/api/system/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  /**
   * Eliminar un perfil (Nota: Esto no elimina el usuario de Auth por seguridad, solo el perfil)
   */
  deleteProfile: async (userId: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
};
