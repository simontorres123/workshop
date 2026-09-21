import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('workshop_sales')
      .select('id, organization_id, branch_id')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
    if (saleError) throw saleError;
    if (!sale) return NextResponse.json({ success: false, error: 'Venta no encontrada' }, { status: 404 });
    if (context.role !== 'org_admin' && context.role !== 'super_admin' && !(context.assignedBranches || []).includes(sale.branch_id)) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a la sucursal de esta venta' }, { status: 403 });
    }
    const { data: cancelledSale, error } = await supabaseAdmin.rpc('cancel_workshop_sale', {
      p_organization_id: context.organizationId,
      p_sale_id: id,
      p_cancelled_by: context.userId || null,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, data: cancelledSale });
  } catch (error) {
    console.error('Error cancelando venta:', error);
    const message = error instanceof Error ? error.message : 'No se pudo cancelar la venta';
    return NextResponse.json({ success: false, error: message.replace(/^.*?: /, '') }, { status: 400 });
  }
}
