import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const url = new URL(request.url);
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && !(context.assignedBranches || []).length) {
      return NextResponse.json({ success: false, error: 'No tienes una sucursal asignada' }, { status: 403 });
    }
    let query = supabaseAdmin.from('workshop_sales').select('*, workshop_sale_items(*)').eq('organization_id', context.organizationId).order('created_at', { ascending: false });
    if (url.searchParams.get('from')) query = query.gte('created_at', url.searchParams.get('from')!);
    if (url.searchParams.get('to')) query = query.lt('created_at', url.searchParams.get('to')!);
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && (context.assignedBranches || []).length) query = query.in('branch_id', context.assignedBranches || []);
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
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && !(context.assignedBranches || []).includes(branchId)) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, organization_id, is_active')
      .eq('id', branchId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
    if (branchError) throw branchError;
    if (!branch || branch.is_active === false) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });

    const { data: organization, error: organizationError } = await supabaseAdmin.from('organizations').select('settings').eq('id', context.organizationId).single();
    if (organizationError) throw organizationError;
    const storedTax = organization?.settings && typeof organization.settings === 'object' ? (organization.settings as Record<string, any>).tax || {} : {};
    const taxEnabled = storedTax.enabled !== false;
    const taxRate = taxEnabled ? Math.min(1, Math.max(0, Number(storedTax.rate ?? 0.16))) : 0;
    const pricesIncludeTax = storedTax.pricesIncludeTax !== false;
    const grossSubtotal = items.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.unitPrice || 0)) * Math.max(0, Number(item.quantity || 0)), 0);
    const discount = Math.min(grossSubtotal, Math.max(0, Number(body.discount || 0)));
    const taxableTotal = Math.max(0, grossSubtotal - discount);
    const tax = taxEnabled ? (pricesIncludeTax ? taxableTotal - taxableTotal / (1 + taxRate) : taxableTotal * taxRate) : 0;

    let repairId = body.repairId || null;
    if (!repairId && body.repairFolio) {
      const { data: repair, error: repairError } = await supabaseAdmin.from('repair_orders').select('id, branch_id').eq('organization_id', context.organizationId).eq('folio', String(body.repairFolio).trim().toUpperCase()).maybeSingle();
      if (repairError) throw repairError;
      if (!repair) return NextResponse.json({ success: false, error: 'No encontramos una orden con ese folio' }, { status: 400 });
      if (repair.branch_id !== branchId) return NextResponse.json({ success: false, error: 'La reparación pertenece a otra sucursal' }, { status: 403 });
      repairId = repair.id;
    }
    if (repairId) {
      const { data: repair, error: repairError } = await supabaseAdmin
        .from('repair_orders')
        .select('id, organization_id, branch_id')
        .eq('id', repairId)
        .eq('organization_id', context.organizationId)
        .maybeSingle();
      if (repairError) throw repairError;
      if (!repair || repair.branch_id !== branchId) return NextResponse.json({ success: false, error: 'La reparación no pertenece a la sucursal seleccionada' }, { status: 403 });
      const { data: existingRepairSale, error: existingSaleError } = await supabaseAdmin.from('workshop_sales').select('sale_number, status').eq('organization_id', context.organizationId).eq('repair_id', repairId).not('status', 'in', '(cancelled,refunded)').maybeSingle();
      if (existingSaleError) throw existingSaleError;
      if (existingRepairSale) return NextResponse.json({ success: false, error: `La reparación ya tiene un cobro registrado (${existingRepairSale.sale_number}).` }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin.rpc('create_workshop_sale', {
      p_organization_id: context.organizationId,
      p_branch_id: branchId,
      p_client_id: body.clientId || null,
      p_client_name: body.clientName || null,
      p_client_phone: body.clientPhone || null,
      p_repair_id: repairId,
      p_discount: discount,
      p_tax: Math.round(tax * 100) / 100,
      p_payment_method: body.paymentMethod || 'cash',
      p_amount_paid: Number(body.amountPaid || 0),
      p_items: items,
      p_notes: body.notes || null,
      p_created_by: context.userId || null,
    });
    if (error) throw error;
    if (repairId && data?.status === 'paid') {
      const { data: repair } = await supabaseAdmin
        .from('repair_orders')
        .select('status')
        .eq('id', repairId)
        .eq('organization_id', context.organizationId)
        .maybeSingle();
      if (repair && repair.status !== 'completed') {
        const { error: repairUpdateError } = await supabaseAdmin
          .from('repair_orders')
          .update({ status: 'completed', payment_status: 'paid', completed_at: new Date().toISOString() })
          .eq('id', repairId)
          .eq('organization_id', context.organizationId);
        if (repairUpdateError) throw repairUpdateError;
        await supabaseAdmin.from('repair_status_history').insert({
          repair_id: repairId,
          previous_status: repair.status,
          new_status: 'completed',
          note: `Pago registrado en ${data.sale_number}`,
          created_by: context.userId || null,
        });
      }
    }
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creando venta:', error);
    const message = error instanceof Error ? error.message : 'No se pudo crear la venta';
    return NextResponse.json({ success: false, error: message.replace(/^.*?: /, '') }, { status: 400 });
  }
}
