import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { canReadBranch, getChatbotContext } from '@/lib/chatbot/context';

const statuses = new Set([
  'pending_diagnosis', 'diagnosis_confirmed', 'repair_accepted', 'repair_rejected',
  'in_repair', 'repaired', 'delivered', 'completed', 'pending_payment',
]);

const labels: Record<string, string> = {
  pending_diagnosis: 'Pendiente de diagnóstico',
  diagnosis_confirmed: 'Diagnóstico confirmado',
  repair_accepted: 'Reparación aceptada',
  repair_rejected: 'Reparación rechazada',
  in_repair: 'En reparación',
  repaired: 'Reparado',
  delivered: 'Entregado',
  completed: 'Completado',
  pending_payment: 'Pendiente de pago',
};

export async function GET(request: NextRequest) {
  const context = await getChatbotContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const status = request.nextUrl.searchParams.get('status')?.trim().toLowerCase() || '';
  if (!statuses.has(status)) return NextResponse.json({ success: false, error: 'Filtro no permitido' }, { status: 400 });

  const { data: orders, error } = await supabaseAdmin
    .from('repair_orders')
    .select('id, folio, branch_id, status, client_name, device_type, device_brand, device_model, created_at, total_cost')
    .eq('organization_id', context.organizationId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ success: false, error: 'No se pudieron consultar las reparaciones' }, { status: 500 });

  const data = (orders || []).filter((order) => canReadBranch(context, order.branch_id)).map((order) => {
    const item: Record<string, unknown> = {
      folio: order.folio,
      estado: labels[order.status] || order.status,
      aparato: [order.device_brand, order.device_type, order.device_model].filter(Boolean).join(' '),
      fechaIngreso: order.created_at,
    };
    if (context.role !== 'technician') item.cliente = order.client_name;
    if (context.role === 'org_admin' || context.role === 'super_admin') item.totalEstimado = order.total_cost;
    return item;
  });

  return NextResponse.json({ success: true, data, total: data.length, status });
}
