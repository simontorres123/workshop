import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

// POST /api/push-notifications/send-auto - Enviar notificación automática inmediata
export async function POST(request: NextRequest) {
  try {
    const { type, title, body, data } = await request.json();

    console.log('🤖 Enviando notificación automática inmediata:', { type, title });

    // Identificar al usuario solicitante
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

    if (!userId) {
       return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }

    // Insertar la notificación en In-App Notifications
    const { error: insertError } = await supabaseAdmin
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title: title,
        body: body,
        type: type || 'info',
        link: data?.url
      });

    if (insertError) {
      console.error('❌ Error insertando notificación in-app automática:', insertError);
      throw insertError;
    }

    console.log('✅ Notificación in-app automática insertada para el usuario:', userId);

    // Retornar confirmación
    return NextResponse.json({
      success: true,
      message: 'Notificación automática in-app enviada',
      type: 'automatic',
      data: {
        sentAt: new Date().toISOString(),
        notificationType: type,
        source: 'scheduler'
      }
    });

  } catch (error) {
    console.error('❌ Error sending automatic in-app notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error enviando notificación automática',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}