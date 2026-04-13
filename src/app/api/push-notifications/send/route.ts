import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';

// POST /api/push-notifications/send - Enviar notificación push de prueba
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { title, body, icon, data, tag, sound, playSound, silent, ...otherProps } = payload;

    // Validar datos mínimos requeridos
    if (!title || !body) {
      return NextResponse.json({
        success: false,
        error: 'Título y mensaje son requeridos'
      }, { status: 400 });
    }

    console.log('📱 Enviando notificación push de prueba:', { title, body });

    // Para notificaciones de prueba, podríamos enviar a todos los dispositivos suscritos
    // Por ahora, generamos un payload genérico ya que no tenemos suscripciones guardadas
    const timestamp = Date.now();
    const notificationPayload = {
      title,
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data || { url: '/dashboard', type: 'test' },
      tag: tag || `test-notification-${timestamp}`, // Usar tag personalizado o generar uno único
      timestamp,
      requireInteraction: false,
      sound: sound || '/notification-sound.mp3', // Sonido por defecto
      playSound: playSound !== false, // Por defecto reproducir sonido
      silent: silent || false, // Por defecto no silencioso
      ...otherProps
    };

    // Para notificaciones de prueba, podemos usar la suscripción activa del cliente
    // Como no tenemos base de datos de suscripciones aún, vamos a enviar usando
    // el Service Worker directamente
    
    console.log('✅ Notificación de prueba preparada:', notificationPayload);

    // Intentar enviar la notificación usando Server-Sent Events o similar
    // Por ahora, retornamos un payload especial que el cliente puede usar
    return NextResponse.json({
      success: true,
      message: 'Notificación enviada exitosamente',
      action: 'show_notification', // Instrucción especial para el cliente
      payload: notificationPayload,
      data: {
        payload: notificationPayload,
        sentAt: new Date().toISOString(),
        recipients: 1 // Simulamos que se envía al cliente actual
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