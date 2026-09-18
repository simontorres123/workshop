import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

function getNotificationTitle(type: string) {
  switch (type) {
    case 'warranty_expiring': return '⚠️ Garantías por Vencer';
    case 'low_stock': return '📦 Stock Bajo Detectado';
    case 'pending_repairs': return '🔧 Reparaciones Pendientes';
    case 'daily_summary': return '📊 Resumen del Día';
    case 'backup_reminder': return '💾 Recordatorio: Backup';
    default: return '🔔 Notificación del Sistema';
  }
}

async function getUserId(request: NextRequest) {
  let token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    token = request.cookies.get('auth_token')?.value;
  }
  
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user?.id || null;
}

function calculateNextRun(schedule: string): Date | null {
  const now = new Date();
  
  // Custom: Once
  if (schedule.startsWith('custom_once_')) {
    const parts = schedule.split('_');
    if (parts.length >= 4) {
      const dateStr = parts[2]; // YYYY-MM-DD
      const timePart = parts[3]; // HHhMMm
      const hour = parseInt(timePart.match(/(\d+)h/)?.[1] || '0');
      const minute = parseInt(timePart.match(/(\d+)m/)?.[1] || '0');
      return new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
    }
  }

  // Parses hours and minutes for daily/weekly
  let hour = 0;
  let minute = 0;
  let isWeekly = false;
  let targetWeekday = 1; // 1 = Lunes, 7 = Domingo

  if (schedule.startsWith('custom_daily_')) {
    const timePart = schedule.split('_')[2];
    hour = parseInt(timePart.match(/(\d+)h/)?.[1] || '0');
    minute = parseInt(timePart.match(/(\d+)m/)?.[1] || '0');
  } else if (schedule.startsWith('custom_weekly_')) {
    isWeekly = true;
    const parts = schedule.split('_');
    const weekdayStr = parts[2];
    const timePart = parts[3];
    hour = parseInt(timePart.match(/(\d+)h/)?.[1] || '0');
    minute = parseInt(timePart.match(/(\d+)m/)?.[1] || '0');
    
    const wMap: Record<string, number> = { 'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'domingo': 7 };
    targetWeekday = wMap[weekdayStr] || 1;
  } else if (schedule.startsWith('daily_')) {
    if (schedule.includes('8am')) hour = 8;
    else if (schedule.includes('9am')) hour = 9;
    else if (schedule.includes('6pm')) hour = 18;
  } else if (schedule.startsWith('weekly_')) {
    isWeekly = true;
    if (schedule.includes('monday')) targetWeekday = 1;
    else if (schedule.includes('friday')) targetWeekday = 5;
    
    if (schedule.includes('10am')) hour = 10;
    else if (schedule.includes('5pm')) hour = 17;
  } else {
    return null;
  }

  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  if (!isWeekly) {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1); // Next day
    }
  } else {
    // JavaScript getDay(): 0=Sunday, 1=Monday... 
    let currentDay = now.getDay();
    if (currentDay === 0) currentDay = 7; // Convert to 1-7 (Monday-Sunday)
    
    let daysToAdd = targetWeekday - currentDay;
    if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
      daysToAdd += 7;
    }
    nextRun.setDate(nextRun.getDate() + daysToAdd);
  }

  return nextRun;
}

// GET /api/push-notifications/schedule
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('auto_notification_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map(rule => ({
      id: rule.id,
      type: rule.type,
      title: getNotificationTitle(rule.type),
      schedule: rule.schedule_expr,
      config: rule.config,
      isActive: rule.is_active,
      nextRun: rule.next_run
    }));

    return NextResponse.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/push-notifications/schedule
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { type, schedule, config } = await request.json();

    const calculatedNextRun = calculateNextRun(schedule);
    const nextRunStr = calculatedNextRun ? calculatedNextRun.toISOString() : null;

    const { data, error } = await supabaseAdmin
      .from('auto_notification_rules')
      .insert({
        user_id: userId,
        type,
        schedule_expr: schedule,
        config: config || {},
        is_active: true,
        next_run: nextRunStr
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        type: data.type,
        title: getNotificationTitle(data.type),
        schedule: data.schedule_expr,
        config: data.config,
        isActive: data.is_active,
        nextRun: data.next_run
      }
    });
  } catch (error) {
    console.error('Error creando schedule:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// PUT /api/push-notifications/schedule
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id, isActive } = await request.json();

    const { error } = await supabaseAdmin
      .from('auto_notification_rules')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando schedule:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/push-notifications/schedule
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await request.json();

    const { error } = await supabaseAdmin
      .from('auto_notification_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error borrando schedule:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
