import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const titles: Record<string, string> = {
  warranty_expiring: 'Garantías por vencer', low_stock: 'Stock bajo detectado', pending_repairs: 'Reparaciones pendientes', daily_summary: 'Resumen del día', backup_reminder: 'Recordatorio de respaldo', technician_follow_up: 'Revisión de reparación asignada',
};

function nextRun(schedule: string): Date | null {
  const now = new Date();
  if (schedule.startsWith('custom_once_')) {
    const [, , date, time] = schedule.split('_');
    const hour = Number(time?.match(/(\d+)h/)?.[1] || 0), minute = Number(time?.match(/(\d+)m/)?.[1] || 0);
    return date ? new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`) : null;
  }
  let hour = 0, minute = 0, weekly = false, targetDay = 1;
  if (schedule.startsWith('custom_daily_')) { const time = schedule.split('_')[2]; hour = Number(time?.match(/(\d+)h/)?.[1] || 0); minute = Number(time?.match(/(\d+)m/)?.[1] || 0); }
  else if (schedule.startsWith('custom_weekly_')) { weekly = true; const [, , day, time] = schedule.split('_'); const days: Record<string, number> = { lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6, domingo: 7 }; targetDay = days[day] || 1; hour = Number(time?.match(/(\d+)h/)?.[1] || 0); minute = Number(time?.match(/(\d+)m/)?.[1] || 0); }
  else if (schedule.startsWith('daily_')) hour = schedule.includes('8am') ? 8 : schedule.includes('9am') ? 9 : schedule.includes('6pm') ? 18 : 0;
  else if (schedule.startsWith('weekly_')) { weekly = true; targetDay = schedule.includes('friday') ? 5 : 1; hour = schedule.includes('10am') ? 10 : 17; }
  else return null;
  const result = new Date(now); result.setHours(hour, minute, 0, 0);
  if (!weekly && result <= now) result.setDate(result.getDate() + 1);
  if (weekly) { let current = now.getDay() || 7; let add = targetDay - current; if (add < 0 || (add === 0 && result <= now)) add += 7; result.setDate(result.getDate() + add); }
  return result;
}

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { data, error } = await supabaseAdmin.from('auto_notification_rules').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ success: false, error: 'No se pudieron cargar las reglas' }, { status: 500 });
  return NextResponse.json({ success: true, data: (data || []).map(rule => ({ id: rule.id, type: rule.type, title: titles[rule.type] || 'Notificación del sistema', schedule: rule.schedule_expr, config: rule.config, isActive: rule.is_active, nextRun: rule.next_run })) });
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { type, schedule, config } = await request.json();
  if (!type || !schedule) return NextResponse.json({ success: false, error: 'Selecciona el tipo y horario de la notificación' }, { status: 400 });
  const calculated = nextRun(schedule);
  const { data, error } = await supabaseAdmin.from('auto_notification_rules').insert({ user_id: context.userId, type, schedule_expr: schedule, config: config || {}, is_active: true, next_run: calculated?.toISOString() || null }).select().single();
  if (error) return NextResponse.json({ success: false, error: 'No se pudo crear la regla' }, { status: 500 });
  return NextResponse.json({ success: true, data: { id: data.id, type: data.type, title: titles[data.type] || 'Notificación del sistema', schedule: data.schedule_expr, config: data.config, isActive: data.is_active, nextRun: data.next_run } }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { id, isActive } = await request.json();
  const { error } = await supabaseAdmin.from('auto_notification_rules').update({ is_active: Boolean(isActive) }).eq('id', id).eq('user_id', context.userId);
  return error ? NextResponse.json({ success: false, error: 'No se pudo actualizar la regla' }, { status: 500 }) : NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  const { id } = await request.json();
  const { error } = await supabaseAdmin.from('auto_notification_rules').delete().eq('id', id).eq('user_id', context.userId);
  return error ? NextResponse.json({ success: false, error: 'No se pudo eliminar la regla' }, { status: 500 }) : NextResponse.json({ success: true });
}
