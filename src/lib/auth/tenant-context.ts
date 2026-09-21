import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { TenantContext } from '@/repositories/supabase-repair-order.repository';

function extractToken(request: NextRequest): string | null {
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken) return authToken;

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith('sb-') || !cookie.name.endsWith('-auth-token')) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(cookie.value));
      if (Array.isArray(parsed)) return parsed[0];
      if (parsed?.access_token) return parsed.access_token;
    } catch {
      if (cookie.value.startsWith('eyJ')) return cookie.value;
    }
  }

  return null;
}

export async function getTenantContext(request: NextRequest): Promise<TenantContext | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return null;

    const { data: profileRaw, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, branch_id, role, user_branches(branch_id)')
      .eq('id', user.id)
      .single();

    if (profileError || !profileRaw?.organization_id) return null;
    const profile = profileRaw as any;
    const assignedBranches = Array.from(new Set([
      profile.branch_id,
      ...(profile.user_branches || []).map((branch: any) => branch.branch_id),
    ].filter(Boolean))) as string[];

    return {
      userId: user.id,
      organizationId: profile.organization_id as string,
      branchId: assignedBranches.length > 0 ? assignedBranches[0] : null,
      assignedBranches,
      role: (profile.role as string | null) || null,
    };
  } catch {
    return null;
  }
}
