import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

const isInvalidRefreshTokenError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /invalid refresh token|refresh token not found/i.test(message);
};

const clearLocalAuthSession = () => {
  if (typeof window === 'undefined') return;

  // Supabase guarda la sesión con una clave sb-<project>-auth-token.
  Object.keys(window.localStorage)
    .filter((key) => key.includes('auth-token'))
    .forEach((key) => window.localStorage.removeItem(key));

  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
};

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  assignedBranches?: string[];
  organizations?: any;
  branches?: any;
};

export const authService = {
  /**
   * Iniciar sesión con email y contraseña
   */
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Registrar un nuevo administrador y su organización (Onboarding)
   */
  registerOrganizationAdmin: async (params: {
    email: string;
    password: string;
    fullName: string;
    orgName: string;
  }) => {
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear el usuario');

    // 2. Generar un slug básico del nombre del taller
    const slug = params.orgName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // 3. Inicializar la organización usando la función RPC
    const { error: rpcError } = await (supabase.rpc as any)('initialize_new_organization', {
      p_user_id: authData.user.id,
      p_org_name: params.orgName,
      p_org_slug: slug,
      p_full_name: params.fullName,
    });

    if (rpcError) throw rpcError;

    return authData;
  },

  /**
   * Cerrar sesión
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Obtener el perfil completo del usuario (Multi-tenant context)
   */
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    // Mantener la consulta del perfil separada de las relaciones opcionales.
    // Un fallo de RLS/relación en organizations o user_branches no debe
    // convertir un perfil válido (incluido super_admin) en una sesión sin rol.
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', { code: error.code, message: error.message, details: error.details });
      return null;
    }

    if (!data) return null;

    const profile = data as any;
    const [{ data: organization }, { data: userBranches }] = await Promise.all([
      profile.organization_id
        ? supabase.from('organizations').select('*').eq('id', profile.organization_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('user_branches').select('branch_id, branches(*)').eq('user_id', userId),
    ]);
    const branchesData = (userBranches || []) as any[];

    return {
      ...profile,
      organizations: organization || null,
      assignedBranches: branchesData.map((b: any) => b.branch_id),
      branches: branchesData.length > 0 ? branchesData[0].branches : null,
      branch_id: branchesData.length > 0 ? branchesData[0].branch_id : profile.branch_id || null
    } as UserProfile;
  },

  /**
   * Escuchar cambios en el estado de autenticación
   */
  onAuthStateChange: (callback: (session: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return subscription;
  },

  /**
   * Obtener sesión actual
   */
  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      if (!isInvalidRefreshTokenError(error)) throw error;

      // Evita que el cliente siga intentando renovar una sesión que Supabase ya invalidó.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      clearLocalAuthSession();
      return null;
    }
  },

  /**
   * Cambiar la contraseña del usuario autenticado
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },
};
