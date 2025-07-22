import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { User } from 'firebase/auth';

export function useAuth() {
  const { user, setUser, loading, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthStateChange((firebaseUser: User | null) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Limpiar la suscripción al desmontar el componente
    return () => unsubscribe();
  }, [setUser, setLoading]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await authService.signInWithEmail(email, password);
      // La sesión se manejará a través de la cookie que se setea en el backend
      // y el onAuthStateChange actualizará el estado global.
      return userCredential;
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
      // onAuthStateChange se encargará de limpiar el estado.
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };
}
