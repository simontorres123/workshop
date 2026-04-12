import { useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

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
    // Escuchar cambios de sesión
    const subscription = authService.onAuthStateChange(async (session) => {
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, loadProfile]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.signInWithEmail(email, password);
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
      }
      return data;
    } catch (error) {
      console.error("Error signing in:", error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setProfile(null);
      // Eliminar la cookie de token
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    } catch (error) {
      console.error("Error signing out:", error);
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
    signIn,
    signOut,
  };
}
