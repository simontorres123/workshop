import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSaleReceiptToken } from '@/lib/sales-receipt-token';
import { getAppUrl } from '@/lib/app-url';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const { data: sale, error } = await supabaseAdmin
    .from('workshop_sales')
    .select('id, organization_id, branch_id, sale_number, status')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single();
  if (error || !sale) return NextResponse.json({ success: false, error: 'Venta no encontrada' }, { status: 404 });
  if (context.role !== 'org_admin' && context.role !== 'super_admin' && !(context.assignedBranches || []).includes(sale.branch_id)) return NextResponse.json({ success: false, error: 'No tienes acceso a la sucursal de esta venta' }, { status: 403 });
  if (sale.status === 'cancelled') return NextResponse.json({ success: false, error: 'No se puede compartir una venta cancelada' }, { status: 400 });

  const token = createSaleReceiptToken(sale.id, sale.organization_id);
  const baseUrl = getAppUrl(new URL(request.url).origin).origin;
  return NextResponse.json({ success: true, data: { saleNumber: sale.sale_number, pdfUrl: `${baseUrl}/api/public/sales/${token}/receipt.pdf` } });
}
