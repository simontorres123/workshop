import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';

// POST /api/push-notifications/subscription - Gestionar suscripciones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, subscription, token, topic } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Acción es requerida' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'subscribe':
        if (!token || !topic) {
          return NextResponse.json(
            { success: false, error: 'Token y topic son requeridos para suscribirse' },
            { status: 400 }
          );
        }
        result = await pushNotificationService.subscribeToTopic([token], topic);
        break;

      case 'validate_token':
        if (!token) {
          return NextResponse.json(
            { success: false, error: 'Token es requerido para validación' },
            { status: 400 }
          );
        }
        const isValid = await pushNotificationService.validateFCMToken(token);
        result = { success: isValid, valid: isValid };
        break;

      case 'get_vapid_key':
        const vapidKey = pushNotificationService.getVapidPublicKey();
        result = { success: true, publicKey: vapidKey };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Acción no soportada' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Acción ${action} ejecutada exitosamente`
    });

  } catch (error) {
    console.error('Error managing push notification subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Error gestionando suscripción' },
      { status: 500 }
    );
  }
}