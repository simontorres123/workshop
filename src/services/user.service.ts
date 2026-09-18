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
      .select('*, user_branches(branch_id, branches(name))')
      .eq('organization_id', organizationId)
      .order('full_name');

    if (error) throw error;
    
    // Mapear para mantener compatibilidad parcial con la interfaz anterior si es posible
    return data.map(user => {
      const uBranches = user.user_branches || [];
      const branchesList = uBranches.map((ub: any) => ({
        id: ub.branch_id,
        name: ub.branches?.name
      }));
      return {
        ...user,
        assignedBranches: branchesList.map((b: any) => b.id),
        branches: branchesList.length > 0 ? branchesList[0] : null,
        branch_id: branchesList.length > 0 ? branchesList[0].id : null,
        all_branches: branchesList
      };
    });
  },

  /**
   * Obtener usuarios de una sucursal específica
   */
  getBranchUsers: async (branchId: string) => {
    // Para buscar por sucursal, primero buscamos en user_branches
    const { data: userIdsData, error: ubError } = await supabase
      .from('user_branches')
      .select('user_id')
      .eq('branch_id', branchId);
      
    if (ubError) throw ubError;
    const userIds = userIdsData.map(ub => ub.user_id);
    
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, user_branches(branch_id, branches(name))')
      .in('id', userIds)
      .order('full_name');

    if (error) throw error;
    
    return data.map(user => {
      const uBranches = user.user_branches || [];
      const branchesList = uBranches.map((ub: any) => ({
        id: ub.branch_id,
        name: ub.branches?.name
      }));
      return {
        ...user,
        assignedBranches: branchesList.map((b: any) => b.id),
        branches: branchesList.length > 0 ? branchesList[0] : null,
        branch_id: branchesList.length > 0 ? branchesList[0].id : null,
        all_branches: branchesList
      };
    });
  },

  /**
   * Actualizar el rol o sucursal de un usuario
   */
  updateUser: async (userId: string, updates: Partial<UserProfile>) => {
    const response = await fetch(`/api/system/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
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
    const response = await fetch(`/api/system/users/${userId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
  }
};
