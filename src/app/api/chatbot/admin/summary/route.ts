import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { isChatbotSuperAdmin } from '@/lib/chatbot/context';

export async function GET(request: NextRequest) {
  if (!(await isChatbotSuperAdmin(request))) return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 });
  const [{ count: organizations }, { data: repairs }, { data: sales }] = await Promise.all([
    supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('repair_orders').select('status'),
    supabaseAdmin.from('workshop_sales').select('status, total, payment_method'),
  ]);
  const repairStatuses = (repairs || []).reduce<Record<string, number>>((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {});
  const activeSales = (sales || []).filter(item => !['cancelled', 'refunded'].includes(item.status));
  return NextResponse.json({ success: true, data: { organizaciones: organizations || 0, reparacionesPorEstado: repairStatuses, ventas: activeSales.length, ingresos: activeSales.reduce((sum, item) => sum + Number(item.total || 0), 0) } });
}
