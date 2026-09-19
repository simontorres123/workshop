import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { canReadBranch, getChatbotContext } from '@/lib/chatbot/context';

export async function GET(request: NextRequest, { params }: { params: Promise<{ folio: string }> }) {
  const context = await getChatbotContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { folio } = await params;
  const { data: order } = await supabaseAdmin.from('repair_orders').select('id, branch_id').eq('organization_id', context.organizationId).eq('folio', decodeURIComponent(folio).toUpperCase()).maybeSingle();
  if (!order || !canReadBranch(context, order.branch_id)) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
  const { data, error } = await supabaseAdmin.from('repair_status_history').select('new_status, created_at').eq('repair_id', order.id).eq('organization_id', context.organizationId).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ success: false, error: 'No se pudo consultar el historial' }, { status: 500 });
  return NextResponse.json({ success: true, data: (data || []).map(item => ({ estado: item.new_status, fecha: item.created_at })) });
}
