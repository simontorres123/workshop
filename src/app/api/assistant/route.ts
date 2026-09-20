import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';
import { helpGuides, GuidedRepair } from '@/lib/chatbot/guided';
import { RepairStatus } from '@/types/repair';

export const dynamic = 'force-dynamic';
const roles = new Set(['super_admin', 'org_admin', 'branch_admin', 'technician']);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const querySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), status: z.enum(RepairStatus).optional(), folio: z.string().trim().max(25).optional(), branchId: z.uuid().optional(), from: date, to: date, timeZone: z.string().max(80).default('America/Monterrey'), page: z.number().int().min(0).max(10000).default(0) }).strict(),
  z.object({ action: z.literal('detail'), id: z.uuid() }).strict(),
]);

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function getScope(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context || !roles.has(context.role || '')) return null;
  const allBranches = context.role === 'org_admin' || context.role === 'super_admin';
  const branchIds = context.assignedBranches || [];
  let query = supabaseAdmin.from('branches').select('id, name').eq('organization_id', context.organizationId).order('name');
  if (!allBranches && branchIds.length) query = query.in('id', branchIds);
  const { data, error } = !allBranches && !branchIds.length ? { data: [], error: null } : await query;
  if (error) throw error;
  return { context, allBranches, branches: data || [], canViewCustomer: context.role !== 'technician', canViewFinancials: allBranches };
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getScope(request);
    if (!scope) return reply({ error: 'Tu sesión terminó. Inicia sesión para consultar tu taller.' }, 401);
    return reply({
      scope: scope.allBranches ? 'Taller actual' : 'Sucursales asignadas',
      canViewCustomer: scope.canViewCustomer,
      canViewFinancials: scope.canViewFinancials,
      branches: scope.branches,
      guides: helpGuides.filter(guide => !guide.financial || scope.canViewFinancials).map(({ financial: _financial, ...guide }) => guide),
    });
  } catch {
    return reply({ error: 'No pudimos cargar las opciones. Intenta nuevamente.' }, 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getScope(request);
    if (!scope) return reply({ error: 'Tu sesión terminó. Inicia sesión para consultar tu taller.' }, 401);
    const parsed = querySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply({ error: 'Revisa los filtros de la consulta.' }, 400);
    const input = parsed.data;
    const columns = 'id, folio, status, branch_id, device_type, device_brand, device_model, created_at';
    const branchNames = new Map(scope.branches.map(branch => [branch.id, branch.name]));
    // Apply authorization before count, ordering and pagination. No client-provided tenant or role.
    function authorized<T extends { eq: (column: string, value: string) => T; in: (column: string, values: string[]) => T }>(query: T): T {
      query = query.eq('organization_id', scope!.context.organizationId);
      if (!scope!.allBranches) query = query.in('branch_id', scope!.branches.map(branch => branch.id));
      return query;
    }
    function project(order: Record<string, unknown>): GuidedRepair {
      return {
        id: String(order.id), folio: String(order.folio), status: String(order.status),
        device: [order.device_brand, order.device_type, order.device_model].filter(Boolean).join(' '),
        createdAt: String(order.created_at), branch: branchNames.get(String(order.branch_id)) || null,
        ...(scope!.canViewCustomer ? { customer: String(order.client_name || '') } : {}),
      };
    }
    if (input.action === 'list') {
      if (input.branchId && !branchNames.has(input.branchId)) return reply({ error: 'La sucursal no está disponible para esta consulta.' }, 403);
      const from = input.from ? DateTime.fromISO(input.from, { zone: input.timeZone }).startOf('day') : null;
      const to = input.to ? DateTime.fromISO(input.to, { zone: input.timeZone }).plus({ days: 1 }).startOf('day') : null;
      if ((from && !from.isValid) || (to && !to.isValid) || (from && to && from >= to)) return reply({ error: 'Revisa el rango de fechas: Desde no puede ser posterior a Hasta.' }, 400);
      const folio = input.folio?.trim().toUpperCase();
      const normalizedFolio = folio && !folio.startsWith('REP-') ? `REP-${folio}` : folio;
      if (normalizedFolio && !/^REP-[A-Z0-9-]{3,20}$/.test(normalizedFolio)) return reply({ error: 'Escribe un folio válido, por ejemplo REP-1234.' }, 400);
      const pageSize = 8;
      if (!scope.allBranches && !scope.branches.length) return reply({ orders: [], total: 0, page: input.page, pageSize });
      let query = authorized(supabaseAdmin.from('repair_orders').select(`${columns}${scope.canViewCustomer ? ', client_name' : ''}`, { count: 'exact' }));
      if (input.status) query = query.eq('status', input.status);
      if (normalizedFolio) query = query.eq('folio', normalizedFolio);
      if (input.branchId) query = query.eq('branch_id', input.branchId);
      if (from) query = query.gte('created_at', from.toUTC().toISO()!);
      if (to) query = query.lt('created_at', to.toUTC().toISO()!);
      const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range(input.page * pageSize, (input.page + 1) * pageSize - 1);
      if (error) throw error;
      return reply({ orders: (data || []).map(order => project(order as unknown as Record<string, unknown>)), total: count || 0, page: input.page, pageSize });
    }
    if (!scope.allBranches && !scope.branches.length) return reply({ error: 'No encontramos esa orden entre las que puedes consultar.' }, 404);
    const { data, error } = await authorized(supabaseAdmin.from('repair_orders').select(`${columns}, problem_description, confirmed_diagnosis, warranty_period_months, storage_period_months${scope.canViewCustomer ? ', client_name' : ''}`)).eq('id', input.id).maybeSingle();
    if (error) throw error;
    if (!data) return reply({ error: 'No encontramos esa orden entre las que puedes consultar.' }, 404);
    const order = data as unknown as Record<string, unknown>;
    // History belongs to the parent order authorized above; this table has no organization_id.
    const { data: history, error: historyError } = await supabaseAdmin.from('repair_status_history').select('new_status, created_at').eq('repair_id', input.id).order('created_at', { ascending: false }).limit(30);
    if (historyError) throw historyError;
    let payment;
    if (scope.canViewFinancials) {
      const { data: sale, error: saleError } = await supabaseAdmin.from('workshop_sales').select('total, payment_method, created_at').eq('organization_id', scope.context.organizationId).eq('repair_id', input.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (saleError) throw saleError;
      payment = sale ? { amount: Number(sale.total), method: sale.payment_method, date: sale.created_at } : null;
    }
    return reply({ ...project(order), problem: order.problem_description, diagnosis: order.confirmed_diagnosis || null, warrantyMonths: order.warranty_period_months, storageMonths: order.storage_period_months, history: (history || []).map(item => ({ status: item.new_status, date: item.created_at })), ...(scope.canViewFinancials ? { payment } : {}) });
  } catch {
    return reply({ error: 'No pudimos consultar la información en este momento. Intenta nuevamente.' }, 503);
  }
}
