import { NextRequest, NextResponse } from 'next/server';

// Este endpoint simula un sistema donde se pueden enviar notificaciones
// desde dispositivos móviles a todos los navegadores suscritos

export async function POST(request: NextRequest) {
  try {
    const { title, body, sourceDevice, urgency, data } = await request.json();

    // Validar datos
    if (!title || !body) {
      return NextResponse.json({
        success: false,
        error: 'Título y mensaje son requeridos'
      }, { status: 400 });
    }

    console.log('📱→💻 Sending notification from mobile to browsers:', {
      title,
      body,
      sourceDevice: sourceDevice || 'unknown',
      urgency: urgency || 'normal'
    });

    // En una implementación real, aquí harías:
    // 1. Obtener todas las suscripciones web push de la base de datos
    // 2. Enviar la notificación a cada suscripción usando web-push
    // 3. Registrar estadísticas de entrega

    const notification = {
      title: `📱 ${title}`,
      body: `${body}\n\nEnviado desde: ${sourceDevice || 'Dispositivo móvil'}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `mobile-notification-${Date.now()}`,
      data: {
        source: 'mobile',
        sourceDevice,
        urgency,
        timestamp: Date.now(),
        url: data?.url || '/dashboard',
        ...data
      },
      actions: [
        {
          action: 'view',
          title: 'Ver detalles',
          icon: '/favicon.ico'
        },
        {
          action: 'dismiss',
          title: 'Descartar'
        }
      ],
      requireInteraction: urgency === 'high',
      timestamp: Date.now()
    };

    // Simular envío exitoso
    // En producción, esto enviaría a todas las suscripciones reales
    console.log('✅ Notification prepared for all subscribers:', notification);

    return NextResponse.json({
      success: true,
      message: 'Notificación enviada a todos los navegadores suscritos',
      action: 'show_notification', // Para demostración local
      payload: notification,
      stats: {
        totalSubscriptions: 1, // En producción sería el número real
        sent: 1,
        failed: 0,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error sending mobile-to-browser notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error enviando notificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint para obtener estadísticas
export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      feature: 'Mobile to Browser Push Notifications',
      description: 'Send push notifications from mobile devices to web browsers',
      endpoints: {
        send: 'POST /api/push-notifications/send-to-all',
        subscribe: 'POST /api/push-notifications/web-subscription'
      },
      supportedSources: ['iPhone', 'Android', 'Desktop', 'API'],
      implementation: 'Web Push Protocol with VAPID keys'
    }
  });
}