import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const url = new URL(request.url);
    let query = supabaseAdmin.from('workshop_sales').select('*, workshop_sale_items(*)').eq('organization_id', context.organizationId).order('created_at', { ascending: false });
    if (url.searchParams.get('from')) query = query.gte('created_at', url.searchParams.get('from')!);
    if (url.searchParams.get('to')) query = query.lt('created_at', url.searchParams.get('to')!);
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && context.assignedBranches.length) query = query.in('branch_id', context.assignedBranches);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron cargar las ventas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const branchId = body.branchId || context.branchId;
    const items = Array.isArray(body.items) ? body.items : [];
    if (!branchId) return NextResponse.json({ success: false, error: 'Selecciona una sucursal para registrar la venta' }, { status: 400 });
    if (!items.length) return NextResponse.json({ success: false, error: 'Agrega al menos un producto al carrito' }, { status: 400 });
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && !context.assignedBranches.includes(branchId)) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });

    let repairId = body.repairId || null;
    if (!repairId && body.repairFolio) {
      const { data: repair, error: repairError } = await supabaseAdmin.from('repair_orders').select('id').eq('organization_id', context.organizationId).eq('folio', String(body.repairFolio).trim().toUpperCase()).maybeSingle();
      if (repairError) throw repairError;
      if (!repair) return NextResponse.json({ success: false, error: 'No encontramos una orden con ese folio' }, { status: 400 });
      repairId = repair.id;
    }

    const { data, error } = await supabaseAdmin.rpc('create_workshop_sale', {
      p_organization_id: context.organizationId,
      p_branch_id: branchId,
      p_client_id: body.clientId || null,
      p_client_name: body.clientName || null,
      p_client_phone: body.clientPhone || null,
      p_repair_id: repairId,
      p_discount: Number(body.discount || 0),
      p_tax: Number(body.tax || 0),
      p_payment_method: body.paymentMethod || 'cash',
      p_amount_paid: Number(body.amountPaid || 0),
      p_items: items,
      p_notes: body.notes || null,
      p_created_by: context.userId || null,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creando venta:', error);
    const message = error instanceof Error ? error.message : 'No se pudo crear la venta';
    return NextResponse.json({ success: false, error: message.replace(/^.*?: /, '') }, { status: 400 });
  }
}
