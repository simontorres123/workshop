import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return { error: 'No autorizado' as const, status: 401 as const };

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return { error: 'Sesión inválida' as const, status: 401 as const };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'super_admin') {
    return { error: 'Permisos insuficientes' as const, status: 403 as const };
  }

  return { user, profile };
}
