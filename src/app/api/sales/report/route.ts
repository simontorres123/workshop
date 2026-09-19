import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let query = supabaseAdmin.from('workshop_sales').select('id, branch_id, total, subtotal, discount, tax, payment_method, status, created_at').eq('organization_id', context.organizationId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lt('created_at', to);
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && context.assignedBranches.length) query = query.in('branch_id', context.assignedBranches);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(5000);
    if (error) throw error;
    const sales = data || [];
    const valid = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'refunded');
    const byPayment = valid.reduce<Record<string, number>>((summary, sale) => { summary[sale.payment_method] = (summary[sale.payment_method] || 0) + Number(sale.total || 0); return summary; }, {});
    return NextResponse.json({ success: true, data: { totalSales: valid.length, grossTotal: valid.reduce((sum, sale) => sum + Number(sale.total || 0), 0), cancelledSales: sales.filter(sale => sale.status === 'cancelled').length, averageTicket: valid.length ? valid.reduce((sum, sale) => sum + Number(sale.total || 0), 0) / valid.length : 0, byPayment } });
  } catch (error) {
    console.error('Error obteniendo reporte de ventas:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cargar el reporte de ventas' }, { status: 500 });
  }
}
