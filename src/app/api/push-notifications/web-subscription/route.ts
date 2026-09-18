import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

// Interface para la suscripción web push
interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// POST /api/push-notifications/web-subscription - Guardar suscripción web push
export async function POST(request: NextRequest) {
  try {
    const subscription: WebPushSubscription = await request.json();

    // Validar que los datos de suscripción estén completos
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'Datos de suscripción incompletos' },
        { status: 400 }
      );
    }

    // Identificar al usuario autenticado
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('auth_token')?.value;
    }
    
    let userId = null;

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Insertar la suscripción en Supabase usando onConflict (upsert)
    // El endpoint es UNIQUE, así que actualizamos las keys si ya existe
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('❌ Error guardando suscripción en Supabase:', error);
      throw error;
    }

    console.log('✅ Web push subscription saved for user:', userId || 'anonymous');

    return NextResponse.json({
      success: true,
      message: 'Suscripción guardada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error saving web push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Error guardando suscripción' },
      { status: 500 }
    );
  }
}

// DELETE /api/push-notifications/web-subscription - Eliminar suscripción web push
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint es requerido' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('❌ Error eliminando suscripción en Supabase:', error);
      throw error;
    }

    console.log('🗑️ Web push subscription removed:', endpoint.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      message: 'Suscripción eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error removing web push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando suscripción' },
      { status: 500 }
    );
  }
}