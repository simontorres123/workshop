import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { requireSuperAdmin } from '@/lib/server/require-super-admin';

export async function GET(request: NextRequest) {
  try {
    const access = await requireSuperAdmin(request);
    if ('error' in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const [{ data: users, error: usersError }, { data: organizations, error: organizationsError }, { data: branches, error: branchesError }, { data: authUsers, error: authUsersError }] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, role, organization_id, created_at, organizations(id, name, slug), user_branches(branch_id, branches(id, name, organization_id))')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('organizations')
        .select('id, name, slug, is_active')
        .order('name'),
      supabaseAdmin
        .from('branches')
        .select('id, name, organization_id, is_active')
        .order('name'),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (usersError) throw usersError;
    if (organizationsError) throw organizationsError;
    if (branchesError) throw branchesError;
    if (authUsersError) throw authUsersError;

    const emailByUserId = new Map((authUsers?.users || []).map((user) => [user.id, user.email || '']));

    const normalizedUsers = (users || []).map((user: any) => ({
      ...user,
      email: emailByUserId.get(user.id) || '',
      organization: Array.isArray(user.organizations) ? user.organizations[0] : user.organizations,
      assignedBranches: (user.user_branches || []).map((assignment: any) => ({
        id: assignment.branch_id,
        name: assignment.branches?.name || 'Sucursal',
        organizationId: assignment.branches?.organization_id,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: { users: normalizedUsers, organizations: organizations || [], branches: branches || [] },
    });
  } catch (error) {
    console.error('Error en GET /api/system/users:', error);
    return NextResponse.json({ success: false, error: 'Error cargando usuarios del sistema' }, { status: 500 });
  }
}
