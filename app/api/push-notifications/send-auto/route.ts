import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';

// POST /api/push-notifications/send-auto - Enviar notificación automática inmediata
export async function POST(request: NextRequest) {
  try {
    const { type, title, body, data } = await request.json();

    console.log('🤖 Enviando notificación automática inmediata:', { type, title });

    // Crear el payload para la notificación
    const notificationPayload = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data || { url: '/dashboard' },
      tag: `auto-${type}-${Date.now()}`,
      timestamp: Date.now(),
      requireInteraction: false,
      sound: '/notification-sound.mp3',
      playSound: true,
      silent: false
    };

    console.log('📱 Payload de notificación automática:', notificationPayload);

    // REALMENTE enviar la notificación usando el service
    const result = await pushNotificationService.sendNotificationToAll({
      title: notificationPayload.title,
      body: notificationPayload.body,
      icon: notificationPayload.icon,
      data: notificationPayload.data,
      tag: notificationPayload.tag,
      requireInteraction: notificationPayload.requireInteraction
    });

    console.log('✅ Notificación automática enviada:', result);

    // Retornar confirmación
    return NextResponse.json({
      success: true,
      message: 'Notificación automática enviada',
      action: 'show_notification',
      payload: notificationPayload,
      type: 'automatic',
      pushResult: result,
      data: {
        sentAt: new Date().toISOString(),
        notificationType: type,
        source: 'scheduler'
      }
    });

  } catch (error) {
    console.error('❌ Error sending automatic notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error enviando notificación automática',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}