import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const { data: order, error } = await supabaseAdmin
      .from('repair_orders')
      .select('id, folio, organization_id, client_signature_token')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 });

    const { data: signature, error: signatureError } = await supabaseAdmin
      .from('digital_signatures')
      .select('id, signature_data_url, signer_name, signer_role, device_info, metadata, created_at')
      .eq('parent_type', 'repair_order')
      .eq('parent_id', id)
      .eq('signer_role', 'client')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (signatureError) throw signatureError;

    const origin = request.nextUrl.origin;
    return NextResponse.json({
      success: true,
      data: {
        folio: order.folio,
        url: `${origin}/sign/${order.client_signature_token}`,
        signed: Boolean(signature),
        signature: signature ? {
          id: signature.id,
          signatureDataURL: signature.signature_data_url,
          signerName: signature.signer_name,
          signerRole: signature.signer_role,
          deviceInfo: signature.device_info,
          metadata: signature.metadata,
          timestamp: signature.created_at,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error obteniendo enlace de firma:', error);
    return NextResponse.json({ success: false, error: 'No se pudo preparar el enlace de firma' }, { status: 500 });
  }
}
