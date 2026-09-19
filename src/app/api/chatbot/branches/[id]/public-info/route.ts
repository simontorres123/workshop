import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { canReadBranch, getChatbotContext } from '@/lib/chatbot/context';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getChatbotContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const { data: branch } = await supabaseAdmin.from('branches').select('id, name, address, phone, is_active, organization_id').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
  if (!branch || !canReadBranch(context, branch.id)) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, data: { nombre: branch.name, direccion: branch.address, telefono: branch.phone, activa: branch.is_active } });
}
