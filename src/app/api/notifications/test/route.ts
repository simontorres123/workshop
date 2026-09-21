import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { type = 'info', title = 'Prueba de notificación', body = 'Esta notificación aparecerá en la campana.', link } = await request.json();
  const { error } = await supabaseAdmin.from('in_app_notifications').insert({ user_id: context.userId, type, title, body, link: link || null });
  return error ? NextResponse.json({ success: false, error: 'No se pudo crear la notificación' }, { status: 500 }) : NextResponse.json({ success: true });
}
