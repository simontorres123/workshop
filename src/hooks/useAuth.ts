import { useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

// Flag global para evitar múltiples inicializaciones entre componentes
let authInitialized = false;

/**
 * Hook central de autenticación.
 * Gestiona la sesión, el perfil del usuario y el estado de carga.
 */
export function useAuth() {
  const {
    user,
    profile,
    setUser,
    setProfile,
    loading,
    setLoading,
    isAuthenticated,
    getOrganizationId,
    getRole
  } = useAuthStore();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const userProfile = await authService.getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    }
  }, [setProfile]);

  useEffect(() => {
    // Si ya inicializamos globalmente, no repetir
    if (authInitialized) return;
    authInitialized = true;

    // Si el store ya tiene usuario (ej: login directo), no reiniciar loading
    const currentState = useAuthStore.getState();
    if (currentState.user && currentState.profile) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const session = await authService.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios futuros
    const subscription = authService.onAuthStateChange(async (session) => {
      if (!mounted) return;

      if (session?.user) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.id !== session.user.id) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, loadProfile]);

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setProfile(null);
      // Reset para que la próxima sesión re-inicialice
      authInitialized = false;
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    organizationId: getOrganizationId(),
    role: getRole(),
    isSuperAdmin: getRole() === 'super_admin',
    isOrgAdmin: getRole() === 'org_admin',
    signOut,
  };
}
