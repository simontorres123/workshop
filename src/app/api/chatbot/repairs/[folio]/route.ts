import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { canReadBranch, getChatbotContext } from '@/lib/chatbot/context';

const publicStatuses = new Set(['pending_diagnosis', 'diagnosis_confirmed', 'repair_accepted', 'repair_rejected', 'in_repair', 'repaired', 'delivered', 'completed']);

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_diagnosis: 'Pendiente de diagnóstico', diagnosis_confirmed: 'Diagnóstico confirmado',
    repair_accepted: 'Reparación aceptada', repair_rejected: 'Reparación rechazada',
    in_repair: 'En reparación', repaired: 'Reparado', delivered: 'Entregado', completed: 'Completado'
  };
  return labels[status] || status;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ folio: string }> }) {
  const context = await getChatbotContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const { folio } = await params;
  const normalizedFolio = decodeURIComponent(folio).trim().toUpperCase();
  if (!/^REP-[A-Z0-9-]{3,20}$/.test(normalizedFolio)) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });

  const { data: order, error } = await supabaseAdmin.from('repair_orders')
    .select('id, folio, organization_id, branch_id, status, client_name, client_phone, device_type, device_brand, device_model, device_description, problem_description, confirmed_diagnosis, labor_cost, parts_cost, total_cost, estimated_date, completed_at, delivered_at, warranty_period_months, storage_period_months, created_at, updated_at')
    .eq('organization_id', context.organizationId)
    .eq('folio', normalizedFolio)
    .maybeSingle();
  if (error || !order || !canReadBranch(context, order.branch_id)) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });

  const { data: branch } = await supabaseAdmin.from('branches').select('id, name, address, phone').eq('id', order.branch_id).eq('organization_id', context.organizationId).maybeSingle();
  const { data: payment } = await supabaseAdmin.from('workshop_sales').select('id, sale_number, total, payment_method, created_at, status').eq('organization_id', context.organizationId).eq('repair_id', order.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();

  const result: Record<string, unknown> = {
    folio: order.folio,
    estado: publicStatuses.has(order.status) ? statusLabel(order.status) : 'En proceso',
    aparato: [order.device_brand, order.device_type, order.device_model].filter(Boolean).join(' '),
    fechaIngreso: order.created_at,
    fechaCompletado: order.completed_at,
    sucursal: branch?.name || null,
    garantiaMeses: order.warranty_period_months,
    almacenamientoMeses: order.storage_period_months,
  };

  if (context.role !== 'technician') {
    result.cliente = order.client_name;
    result.telefono = order.client_phone;
  }
  if (context.role === 'org_admin' || context.role === 'super_admin') {
    result.problema = order.problem_description;
    result.diagnostico = order.confirmed_diagnosis || null;
    result.totalEstimado = order.total_cost;
    result.costoManoObra = order.labor_cost;
    result.costoRefacciones = order.parts_cost;
    result.pagada = Boolean(payment);
    result.pago = payment ? { monto: Number(payment.total || 0), metodo: payment.payment_method, fecha: payment.created_at, folio: payment.sale_number } : null;
  } else {
    result.pagada = undefined;
  }

  return NextResponse.json({ success: true, data: result });
}
