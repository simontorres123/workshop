import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const editableStatuses = ['diagnosis_confirmed', 'repair_accepted', 'in_repair'];
const mapPart = (row: any) => ({ id: row.id, repairId: row.repair_id, productId: row.product_id, productName: row.product_name, sku: row.sku, unitCost: Number(row.unit_cost || 0), unitPrice: Number(row.unit_price || 0), quantity: row.quantity, status: row.status, reservedAt: row.reserved_at, usedAt: row.used_at });

async function contextAndOrder(request: NextRequest, id: string) {
  const context = await getTenantContext(request);
  if (!context) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  const { data: order, error } = await supabaseAdmin.from('repair_orders').select('id, status, branch_id').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
  if (error || !order) return { error: NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 }) };
  return { context, order };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id; const result = await contextAndOrder(request, id); if ('error' in result) return result.error;
  const { data, error } = await supabaseAdmin.from('repair_parts').select('*').eq('repair_id', id).eq('organization_id', result.context.organizationId).order('created_at');
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las refacciones' }, { status: 500 });
  return NextResponse.json({ data: (data || []).map(mapPart) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id; const result = await contextAndOrder(request, id); if ('error' in result) return result.error;
  const { context, order } = result; const body = await request.json(); const action = body.action || 'add';
  try {
    if (action === 'add') {
      if (!editableStatuses.includes(order.status)) return NextResponse.json({ error: 'Las refacciones se pueden agregar desde Diagnóstico confirmado' }, { status: 400 });
      if (!order.branch_id) return NextResponse.json({ error: 'La orden no tiene sucursal asignada' }, { status: 400 });
      const quantity = Number(body.quantity); if (!body.productId || !Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: 'Producto y cantidad válidos son obligatorios' }, { status: 400 });
      const { data: product, error: productError } = await supabaseAdmin.from('inventory_products').select('id,name,sku,cost_price,sale_price').eq('id', body.productId).eq('organization_id', context.organizationId).eq('status', 'active').maybeSingle();
      if (productError || !product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      const { data, error } = await supabaseAdmin.from('repair_parts').insert({ organization_id: context.organizationId, branch_id: order.branch_id, repair_id: id, product_id: product.id, product_name: product.name, sku: product.sku, unit_cost: product.cost_price || 0, unit_price: product.sale_price || 0, quantity, status: 'proposed', created_by: context.userId || null }).select().single();
      if (error) throw error; return NextResponse.json({ data: mapPart(data) }, { status: 201 });
    }
    if (!['reserve', 'release', 'use'].includes(action)) return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    const functionName = action === 'reserve' ? 'reserve_repair_part' : action === 'release' ? 'release_repair_part' : 'use_repair_parts';
    const args = action === 'use' ? { p_repair_id: id, p_organization_id: context.organizationId } : { p_part_id: body.partId, p_organization_id: context.organizationId };
    const { data, error } = await supabaseAdmin.rpc(functionName, args);
    if (error) throw error;
    return NextResponse.json({ data: Array.isArray(data) ? data.map(mapPart) : mapPart(data) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la refacción' }, { status: 400 }); }
}
