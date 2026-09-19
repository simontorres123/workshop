import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

const mapSignature = (signature: any) => signature ? {
  id: signature.id,
  signatureDataURL: signature.signature_data_url,
  signerName: signature.signer_name,
  signerRole: signature.signer_role,
  deviceInfo: signature.device_info,
  metadata: signature.metadata,
  timestamp: signature.created_at,
} : null;

async function findOrder(token: string) {
  const { data, error } = await supabaseAdmin
    .from('repair_orders')
    .select('id, folio, client_name, client_phone, device_type, device_brand, device_model, device_serial, device_description, problem_description, warranty_period_months, storage_period_months, created_at, client_signature_token')
    .eq('client_signature_token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const order = await findOrder(token);
    if (!order) return NextResponse.json({ success: false, error: 'Enlace de firma inválido o expirado' }, { status: 404 });

    const { data: signature, error } = await supabaseAdmin
      .from('digital_signatures')
      .select('*')
      .eq('parent_type', 'repair_order')
      .eq('parent_id', order.id)
      .eq('signer_role', 'client')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ success: true, data: { ...order, signature: mapSignature(signature) } });
  } catch (error) {
    console.error('Error consultando firma de comprobante:', error);
    return NextResponse.json({ success: false, error: 'No se pudo consultar el comprobante' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const order = await findOrder(token);
    if (!order) return NextResponse.json({ success: false, error: 'Enlace de firma inválido o expirado' }, { status: 404 });

    const body = await request.json();
    if (!body.signatureDataURL?.startsWith('data:image/')) return NextResponse.json({ success: false, error: 'La firma no tiene un formato válido' }, { status: 400 });
    if (!body.signerName?.trim()) return NextResponse.json({ success: false, error: 'El nombre del cliente es obligatorio' }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from('digital_signatures')
      .select('id')
      .eq('parent_type', 'repair_order')
      .eq('parent_id', order.id)
      .eq('signer_role', 'client')
      .maybeSingle();
    if (existing) return NextResponse.json({ success: false, error: 'Este comprobante ya fue firmado' }, { status: 409 });

    const { data: signature, error } = await supabaseAdmin
      .from('digital_signatures')
      .insert({
        parent_type: 'repair_order',
        parent_id: order.id,
        signature_data_url: body.signatureDataURL,
        signer_name: body.signerName.trim(),
        signer_role: 'client',
        device_info: body.deviceInfo || request.headers.get('user-agent') || 'Dispositivo no identificado',
        metadata: body.metadata || {},
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, data: mapSignature(signature) }, { status: 201 });
  } catch (error) {
    console.error('Error guardando firma de comprobante:', error);
    return NextResponse.json({ success: false, error: 'No se pudo guardar la firma' }, { status: 500 });
  }
}
