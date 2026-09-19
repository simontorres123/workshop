import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const { id } = await params;
    const { data: sale, error } = await supabaseAdmin.rpc('cancel_workshop_sale', {
      p_organization_id: context.organizationId,
      p_sale_id: id,
      p_cancelled_by: context.userId || null,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error('Error cancelando venta:', error);
    const message = error instanceof Error ? error.message : 'No se pudo cancelar la venta';
    return NextResponse.json({ success: false, error: message.replace(/^.*?: /, '') }, { status: 400 });
  }
}
