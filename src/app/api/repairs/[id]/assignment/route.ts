import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const canManageAssignments = (role: string | null) => ['super_admin', 'org_admin', 'branch_admin', 'technician'].includes(role || '');

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  if (!canManageAssignments(context.role)) return NextResponse.json({ success: false, error: 'No tienes permiso para asignar técnicos' }, { status: 403 });
  const { id } = await params;
  const { technicianId } = await request.json() as { technicianId?: string | null };
  const { data: order, error: orderError } = await supabaseAdmin.from('repair_orders')
    .select('id, organization_id, branch_id, assigned_technician_id').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
  if (orderError || !order) return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 });
  if (!['org_admin', 'super_admin'].includes(context.role || '') && !(context.assignedBranches || []).includes(order.branch_id)) {
    return NextResponse.json({ success: false, error: 'No tienes acceso a esta orden' }, { status: 403 });
  }

  let technicianName: string | undefined;
  if (technicianId) {
    const { data: technician } = await supabaseAdmin.from('user_profiles').select('id, full_name, role, branch_id')
      .eq('id', technicianId).eq('organization_id', context.organizationId).in('role', ['technician', 'branch_admin']).maybeSingle();
    if (!technician) return NextResponse.json({ success: false, error: 'El técnico no pertenece a este taller' }, { status: 400 });
    const { data: membership } = await supabaseAdmin.from('user_branches').select('user_id').eq('user_id', technicianId).eq('branch_id', order.branch_id).maybeSingle();
    if (technician.branch_id !== order.branch_id && !membership) return NextResponse.json({ success: false, error: 'El técnico no está asignado a la sucursal de esta orden' }, { status: 400 });
    technicianName = technician.full_name || 'Técnico asignado';
  }
  const timestamp = technicianId ? new Date().toISOString() : null;
  const { error: updateError } = await supabaseAdmin.from('repair_orders').update({ assigned_technician_id: technicianId || null, assigned_at: timestamp, assigned_by: context.userId || null }).eq('id', id).eq('organization_id', context.organizationId);
  if (updateError) return NextResponse.json({ success: false, error: 'No se pudo guardar la asignación' }, { status: 500 });
  await supabaseAdmin.from('repair_assignment_history').insert({ organization_id: context.organizationId, branch_id: order.branch_id, repair_id: id, previous_technician_id: order.assigned_technician_id, assigned_technician_id: technicianId || null, assigned_by: context.userId || null });
  return NextResponse.json({ success: true, data: { assignedTechnicianId: technicianId || null, assignedTechnicianName: technicianName || null, assignedAt: timestamp } });
}
