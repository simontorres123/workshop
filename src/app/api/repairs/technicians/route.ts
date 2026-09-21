import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

// El equipo operativo puede asignar responsables dentro de su propia sucursal.
// Nunca obtiene acceso a técnicos de otro taller o de otra sucursal.
const canManageAssignments = (role: string | null) => ['super_admin', 'org_admin', 'branch_admin', 'technician'].includes(role || '');

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  if (!canManageAssignments(context.role)) return NextResponse.json({ success: false, error: 'No tienes permiso para asignar técnicos' }, { status: 403 });

  const branchId = new URL(request.url).searchParams.get('branchId');
  if (!branchId) return NextResponse.json({ success: false, error: 'La sucursal es obligatoria' }, { status: 400 });
  if (!['org_admin', 'super_admin'].includes(context.role || '') && !(context.assignedBranches || []).includes(branchId)) {
    return NextResponse.json({ success: false, error: 'No tienes acceso a esta sucursal' }, { status: 403 });
  }

  const { data: branch, error: branchError } = await supabaseAdmin.from('branches').select('id').eq('id', branchId).eq('organization_id', context.organizationId).maybeSingle();
  if (branchError || !branch) return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('user_profiles').select('id, full_name, role, branch_id')
    .eq('organization_id', context.organizationId).in('role', ['technician', 'branch_admin']);
  if (profilesError) return NextResponse.json({ success: false, error: 'No se pudieron consultar los técnicos' }, { status: 500 });
  const ids = (profiles || []).map(profile => profile.id);
  const { data: memberships } = ids.length ? await supabaseAdmin.from('user_branches').select('user_id').eq('branch_id', branchId).in('user_id', ids) : { data: [] };
  const members = new Set((memberships || []).map(item => item.user_id));
  const technicians = (profiles || []).filter(profile => profile.branch_id === branchId || members.has(profile.id)).map(profile => ({
    id: profile.id, name: profile.full_name || 'Sin nombre', role: profile.role,
  }));
  return NextResponse.json({ success: true, data: technicians }, { headers: { 'Cache-Control': 'private, no-store' } });
}
