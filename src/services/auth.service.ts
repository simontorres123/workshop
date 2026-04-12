import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

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
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, organizations(*), branches(*)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data as any;
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
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};
