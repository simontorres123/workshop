import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';

// GET /api/push-notifications/status - Verificar estado de los servicios
export async function GET() {
  try {
    const status = await pushNotificationService.getServiceStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      message: 'Estado de servicios de push notifications obtenido'
    });
  } catch (error) {
    console.error('Error getting push notification status:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo estado de servicios' },
      { status: 500 }
    );
  }
}

// POST /api/push-notifications/send - Enviar notificación push
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, subscription, token, payload } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: 'Tipo y payload son requeridos' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'web':
        if (!subscription) {
          return NextResponse.json(
            { success: false, error: 'Subscription es requerida para web push' },
            { status: 400 }
          );
        }
        result = await pushNotificationService.sendWebPush(subscription, payload);
        break;

      case 'fcm':
        if (!token) {
          return NextResponse.json(
            { success: false, error: 'Token es requerido para FCM' },
            { status: 400 }
          );
        }
        result = await pushNotificationService.sendFCMNotification({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.image
          },
          data: payload.data
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de notificación no soportado' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Notificación enviada exitosamente'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { success: false, error: 'Error enviando notificación push' },
      { status: 500 }
    );
  }
}