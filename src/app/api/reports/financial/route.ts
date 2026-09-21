import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const allowedRoles = ['org_admin', 'super_admin', 'branch_admin'];
type Context = NonNullable<Awaited<ReturnType<typeof getTenantContext>>>;
type Sale = { id: string; branch_id: string; total: number; subtotal: number; discount: number; tax: number; payment_method: string; repair_id: string | null; created_at: string; workshop_sale_items: Array<{ product_name: string; quantity: number; unit_price: number; unit_cost: number; subtotal: number }> };
type Expense = { id: string; branch_id: string | null; amount: number; category: string; expense_date: string; is_recurring: boolean };

function branchAllowed(context: Context, branchId: string | null) {
  return context.role === 'org_admin' || context.role === 'super_admin' || (!!branchId && (context.assignedBranches || []).includes(branchId));
}
function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }
function safeDate(raw: string | null, fallback: Date) { const result = raw ? new Date(`${raw}T00:00:00`) : fallback; return Number.isNaN(result.valueOf()) ? fallback : result; }
function numeric(value: unknown) { return Number(value || 0); }
function formatKey(date: Date, groupBy: string) { return groupBy === 'month' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : dateOnly(date); }
function labelKey(key: string, groupBy: string) { const date = new Date(`${key}${groupBy === 'month' ? '-01' : ''}T12:00:00`); return new Intl.DateTimeFormat('es-MX', groupBy === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).format(date); }

async function loadPeriod(context: Context, from: string, toExclusive: string, branchId: string | null) {
  let salesQuery = supabaseAdmin.from('workshop_sales').select('id, branch_id, total, subtotal, discount, tax, payment_method, repair_id, created_at, workshop_sale_items(product_name, quantity, unit_price, unit_cost, subtotal)').eq('organization_id', context.organizationId).eq('status', 'paid').gte('created_at', from).lt('created_at', toExclusive).limit(6000);
  let expenseQuery = supabaseAdmin.from('financial_expenses').select('id, branch_id, amount, category, expense_date, is_recurring').eq('organization_id', context.organizationId).gte('expense_date', from.slice(0, 10)).lt('expense_date', toExclusive.slice(0, 10)).limit(3000);
  if (branchId) { salesQuery = salesQuery.eq('branch_id', branchId); expenseQuery = expenseQuery.eq('branch_id', branchId); }
  else if (context.role === 'branch_admin') { salesQuery = salesQuery.in('branch_id', context.assignedBranches || []); expenseQuery = expenseQuery.in('branch_id', context.assignedBranches || []); }
  const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] = await Promise.all([salesQuery, expenseQuery]);
  if (salesError) throw salesError;
  // financial_expenses may not have been migrated yet during rollout; surface a useful controlled API response instead of breaking reports.
  if (expensesError && expensesError.code !== '42P01' && expensesError.code !== 'PGRST205') throw expensesError;
  return { sales: (sales || []) as unknown as Sale[], expenses: (expenses || []) as unknown as Expense[], expensesReady: !expensesError };
}

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  if (!allowedRoles.includes(context.role || '')) return NextResponse.json({ success: false, error: 'No tienes permiso para consultar reportes financieros' }, { status: 403 });
  try {
    const params = new URL(request.url).searchParams;
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = safeDate(params.get('from'), defaultFrom);
    const toDate = safeDate(params.get('to'), now);
    if (toDate < fromDate) return NextResponse.json({ success: false, error: 'El periodo no es válido' }, { status: 400 });
    const toExclusiveDate = new Date(toDate); toExclusiveDate.setDate(toExclusiveDate.getDate() + 1);
    const from = `${dateOnly(fromDate)}T00:00:00.000Z`;
    const toExclusive = `${dateOnly(toExclusiveDate)}T00:00:00.000Z`;
    const branchId = params.get('branchId');
    if (branchId && !branchAllowed(context, branchId)) return NextResponse.json({ success: false, error: 'Sucursal no autorizada' }, { status: 403 });
    const groupBy = params.get('groupBy') === 'month' ? 'month' : 'day';
    const { sales, expenses, expensesReady } = await loadPeriod(context, from, toExclusive, branchId);
    const grossRevenue = sales.reduce((sum, sale) => sum + numeric(sale.total), 0);
    const netRevenue = sales.reduce((sum, sale) => sum + numeric(sale.total) - numeric(sale.tax), 0);
    const taxes = sales.reduce((sum, sale) => sum + numeric(sale.tax), 0);
    const discounts = sales.reduce((sum, sale) => sum + numeric(sale.discount), 0);
    const cogs = sales.reduce((sum, sale) => sum + (sale.workshop_sale_items || []).reduce((items, item) => items + numeric(item.unit_cost) * numeric(item.quantity), 0), 0);
    const grossProfit = netRevenue - cogs;
    const totalExpenses = expenses.reduce((sum, item) => sum + numeric(item.amount), 0);
    const operatingExpenses = expenses.filter(item => item.category !== 'inventory_purchase').reduce((sum, item) => sum + numeric(item.amount), 0);
    const operatingProfit = grossProfit - operatingExpenses;
    const cashFlow = grossRevenue - totalExpenses;
    const buckets = new Map<string, { revenue: number; expenses: number; profit: number }>();
    sales.forEach(sale => { const key = formatKey(new Date(sale.created_at), groupBy); const bucket = buckets.get(key) || { revenue: 0, expenses: 0, profit: 0 }; const net = numeric(sale.total) - numeric(sale.tax); const cost = (sale.workshop_sale_items || []).reduce((sum, item) => sum + numeric(item.unit_cost) * numeric(item.quantity), 0); bucket.revenue += numeric(sale.total); bucket.profit += net - cost; buckets.set(key, bucket); });
    expenses.forEach(expense => { const key = formatKey(new Date(`${expense.expense_date}T12:00:00`), groupBy); const bucket = buckets.get(key) || { revenue: 0, expenses: 0, profit: 0 }; bucket.expenses += numeric(expense.amount); if (expense.category !== 'inventory_purchase') bucket.profit -= numeric(expense.amount); buckets.set(key, bucket); });
    const trend = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ label: labelKey(key, groupBy), ...value, cashFlow: value.revenue - value.expenses }));
    const paymentMethods = sales.reduce<Record<string, number>>((result, sale) => { result[sale.payment_method] = (result[sale.payment_method] || 0) + numeric(sale.total); return result; }, {});
    const expenseByCategory = expenses.reduce<Record<string, number>>((result, expense) => { result[expense.category] = (result[expense.category] || 0) + numeric(expense.amount); return result; }, {});
    const products = new Map<string, { quantity: number; revenue: number; cost: number }>();
    sales.forEach(sale => (sale.workshop_sale_items || []).forEach(item => { const itemStats = products.get(item.product_name) || { quantity: 0, revenue: 0, cost: 0 }; itemStats.quantity += numeric(item.quantity); itemStats.revenue += numeric(item.subtotal); itemStats.cost += numeric(item.unit_cost) * numeric(item.quantity); products.set(item.product_name, itemStats); }));
    const topProducts = Array.from(products.entries()).map(([name, item]) => ({ name, ...item, margin: item.revenue - item.cost })).sort((a, b) => b.margin - a.margin).slice(0, 5);
    let stockQuery = supabaseAdmin.from('inventory_stock').select('product_id, quantity, branch_id').eq('organization_id', context.organizationId).limit(6000);
    if (branchId) stockQuery = stockQuery.eq('branch_id', branchId); else if (context.role === 'branch_admin') stockQuery = stockQuery.in('branch_id', context.assignedBranches || []);
    const { data: stock, error: stockError } = await stockQuery;
    if (stockError) throw stockError;
    const productIds = Array.from(new Set((stock || []).map((row: any) => row.product_id)));
    const { data: catalog, error: catalogError } = productIds.length ? await supabaseAdmin.from('inventory_products').select('id, cost_price, sale_price, name, min_stock').eq('organization_id', context.organizationId).in('id', productIds) : { data: [], error: null };
    if (catalogError) throw catalogError;
    const catalogById = new Map((catalog || []).map((product: any) => [product.id, product]));
    const inventory = (stock || []).reduce((result, row: any) => { const product = catalogById.get(row.product_id); if (!product) return result; const qty = numeric(row.quantity); result.costValue += qty * numeric(product.cost_price); result.saleValue += qty * numeric(product.sale_price); result.units += qty; if (qty <= numeric(product.min_stock)) result.lowStock += 1; return result; }, { costValue: 0, saleValue: 0, units: 0, lowStock: 0 });
    const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
    const recurringMonthly = expenses.filter(item => item.is_recurring).reduce((sum, item) => sum + numeric(item.amount), 0);
    const projection = { revenue30: grossRevenue / days * 30, operatingProfit30: operatingProfit / days * 30 - recurringMonthly, basisDays: days };
    return NextResponse.json({ success: true, data: { period: { from: dateOnly(fromDate), to: dateOnly(toDate), groupBy }, kpis: { grossRevenue, netRevenue, taxes, discounts, cogs, grossProfit, grossMargin: netRevenue ? grossProfit / netRevenue * 100 : 0, totalExpenses, operatingExpenses, operatingProfit, cashFlow, salesCount: sales.length, repairSales: sales.filter(s => !!s.repair_id).length, averageTicket: sales.length ? grossRevenue / sales.length : 0 }, trend, paymentMethods, expenseByCategory, topProducts, inventory, projection, expensesReady } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Error obteniendo reporte financiero:', error); return NextResponse.json({ success: false, error: 'No se pudo cargar el reporte financiero' }, { status: 500 }); }
}
