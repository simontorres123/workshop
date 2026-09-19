import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';
import { supabaseAdmin } from '@/lib/supabase/client';

// POST /api/push-notifications/send - Enviar notificación push de prueba o real
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { title, body, icon, data, tag, sound, playSound, silent, targetUserId, ...otherProps } = payload;

    // Validar datos mínimos requeridos
    if (!title || !body) {
      return NextResponse.json({
        success: false,
        error: 'Título y mensaje son requeridos'
      }, { status: 400 });
    }

    console.log('📱 Solicitud de envío de notificación push:', { title, body, targetUserId });

    const timestamp = Date.now();
    const notificationPayload = {
      title,
      body,
      icon: icon || '/brand/workshop-mark.png',
      badge: '/brand/workshop-mark.png',
      data: data || { url: '/dashboard', type: 'test' },
      tag: tag || `notification-${timestamp}`,
      timestamp,
      requireInteraction: false,
      silent: silent || false,
      ...otherProps
    };

    // Identificar al usuario solicitante
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('auth_token')?.value;
    }
    
    let userId = targetUserId; // Si nos pasan un targetUserId, enviamos a ese usuario

    if (!userId && token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id; // Fallback: Enviar a sí mismo si no hay target
      }
    }

    if (!userId) {
       return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado o targetUserId no proporcionado'
      }, { status: 401 });
    }

    // Insertar la notificación en In-App Notifications
    const { error: insertError } = await supabaseAdmin
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title: notificationPayload.title,
        body: notificationPayload.body,
        type: notificationPayload.data.type || 'info',
        link: notificationPayload.data.url
      });

    if (insertError) {
      console.error('❌ Error insertando notificación in-app:', insertError);
      throw insertError;
    }

    console.log(`✅ Notificación in-app insertada exitosamente para el usuario: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Notificación enviada al buzón del usuario`,
      data: {
        sent: 1,
        failed: 0,
        payload: notificationPayload
      }
    });

  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error enviando notificación push',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}
