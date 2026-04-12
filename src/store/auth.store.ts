import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  activeBranchId: string | null;
  
  // Acciones
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveBranchId: (id: string | null) => void;
  
  // Helpers de Multi-tenancy
  getOrganizationId: () => string | null;
  getBranchId: () => string | null;
  getRole: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  loading: true,
  activeBranchId: null,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: user ? get().loading : false 
  }),

  setProfile: (profile) => {
    let initialBranchId: string | null = null;
    
    if (profile) {
      const role = profile.role;
      if (role === 'technician' || role === 'branch_admin') {
        initialBranchId = profile.branch_id || null;
      }
    }
    
    set({ 
      profile,
      loading: false,
      activeBranchId: initialBranchId
    });
  },

  setLoading: (loading) => set({ loading }),

  setActiveBranchId: (id) => set({ activeBranchId: id }),

  getOrganizationId: () => get().profile?.organization_id || null,
  getBranchId: () => get().profile?.branch_id || null,
  getRole: () => get().profile?.role || null,
}));
