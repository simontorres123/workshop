import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const allowedRoles = ['org_admin', 'super_admin', 'branch_admin'];
const categories = new Set(['rent', 'payroll', 'utilities', 'inventory_purchase', 'transport', 'tools', 'marketing', 'maintenance', 'other']);
const paymentMethods = new Set(['cash', 'card', 'transfer', 'other']);

function hasBranchAccess(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>, branchId: string | null) {
  return context.role === 'org_admin' || context.role === 'super_admin' || (!!branchId && (context.assignedBranches || []).includes(branchId));
}

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!allowedRoles.includes(context.role || '')) return NextResponse.json({ success: false, error: 'No tienes permiso para consultar gastos' }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const branchId = params.get('branchId');
    if (branchId && !hasBranchAccess(context, branchId)) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });
    let query = supabaseAdmin.from('financial_expenses').select('*').eq('organization_id', context.organizationId).order('expense_date', { ascending: false }).limit(200);
    if (params.get('from')) query = query.gte('expense_date', params.get('from')!);
    if (params.get('to')) query = query.lte('expense_date', params.get('to')!);
    if (branchId) query = query.eq('branch_id', branchId);
    else if (context.role === 'branch_admin') query = query.in('branch_id', context.assignedBranches || []);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Error obteniendo gastos:', error); return NextResponse.json({ success: false, error: 'No se pudieron cargar los gastos' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!allowedRoles.includes(context.role || '')) return NextResponse.json({ success: false, error: 'No tienes permiso para registrar gastos' }, { status: 403 });
  try {
    const body = await request.json();
    const branchId = body.branchId || context.branchId || null;
    const amount = Number(body.amount);
    if (!body.description?.trim() || !Number.isFinite(amount) || amount <= 0 || !categories.has(body.category)) return NextResponse.json({ success: false, error: 'Completa descripción, categoría e importe válido' }, { status: 400 });
    if (!hasBranchAccess(context, branchId)) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });
    const { data, error } = await supabaseAdmin.from('financial_expenses').insert({
      organization_id: context.organizationId, branch_id: branchId, category: body.category, description: body.description.trim(), amount,
      expense_date: body.expenseDate || new Date().toISOString().slice(0, 10), payment_method: paymentMethods.has(body.paymentMethod) ? body.paymentMethod : 'cash',
      supplier_name: body.supplierName?.trim() || null, reference: body.reference?.trim() || null, notes: body.notes?.trim() || null,
      is_recurring: Boolean(body.isRecurring), recurring_frequency: body.isRecurring ? body.recurringFrequency || 'monthly' : null, created_by: context.userId,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) { console.error('Error registrando gasto:', error); return NextResponse.json({ success: false, error: 'No se pudo registrar el gasto' }, { status: 500 }); }
}
