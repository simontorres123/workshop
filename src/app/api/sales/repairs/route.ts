import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const money = (value: unknown) => Number(value || 0);

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (context.role !== 'org_admin' && context.role !== 'super_admin' && !(context.assignedBranches || []).length) return NextResponse.json({ success: false, error: 'No tienes una sucursal asignada' }, { status: 403 });
  try {
    const query = new URL(request.url).searchParams.get('q')?.trim() || '';
    let repairsQuery = supabaseAdmin.from('repair_orders').select('*').eq('organization_id', context.organizationId).eq('status', 'repaired').order('completed_at', { ascending: false });
    if (query) repairsQuery = repairsQuery.or(`folio.ilike.%${query}%,client_name.ilike.%${query}%,client_phone.ilike.%${query}%`);
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && (context.assignedBranches || []).length) repairsQuery = repairsQuery.in('branch_id', context.assignedBranches || []);
    const { data: repairs, error: repairsError } = await repairsQuery.limit(50);
    if (repairsError) throw repairsError;
    const ids = (repairs || []).map(repair => repair.id);
    if (!ids.length) return NextResponse.json({ success: true, data: [] });
    const [{ data: parts, error: partsError }, { data: sales, error: salesError }] = await Promise.all([
      supabaseAdmin.from('repair_parts').select('*').in('repair_id', ids).eq('organization_id', context.organizationId).neq('status', 'released'),
      supabaseAdmin.from('workshop_sales').select('id, repair_id, sale_number, status, total, created_at').in('repair_id', ids).eq('organization_id', context.organizationId).neq('status', 'cancelled').neq('status', 'refunded'),
    ]);
    if (partsError) throw partsError;
    if (salesError) throw salesError;
    const partsByRepair = new Map<string, any[]>();
    (parts || []).forEach(part => partsByRepair.set(part.repair_id, [...(partsByRepair.get(part.repair_id) || []), { id: part.id, productId: part.product_id, name: part.product_name, sku: part.sku, quantity: Number(part.quantity || 0), unitPrice: money(part.unit_price), unitCost: money(part.unit_cost), status: part.status }]));
    const saleByRepair = new Map((sales || []).map(sale => [sale.repair_id, sale]));
    const result = (repairs || []).map(repair => {
      const repairParts = partsByRepair.get(repair.id) || [];
      const partsTotal = repairParts.reduce((sum, part) => sum + part.unitPrice * part.quantity, 0);
      const configuredTotal = money(repair.total_cost);
      const labor = money(repair.labor_cost) || Math.max(0, configuredTotal - money(repair.parts_cost));
      const sale = saleByRepair.get(repair.id);
      return { id: repair.id, folio: repair.folio, branchId: repair.branch_id, clientName: repair.client_name, clientPhone: repair.client_phone, device: [repair.device_brand, repair.device_type, repair.device_model].filter(Boolean).join(' '), completedAt: repair.completed_at, laborCost: labor, partsCost: partsTotal, estimatedTotal: labor + partsTotal, configuredTotal, parts: repairParts, existingSale: sale ? { id: sale.id, saleNumber: sale.sale_number, status: sale.status, total: money(sale.total), createdAt: sale.created_at } : null };
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error obteniendo reparaciones cobrables:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron cargar las reparaciones cobrables' }, { status: 500 });
  }
}
