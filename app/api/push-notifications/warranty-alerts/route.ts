import { NextRequest, NextResponse } from 'next/server';
import { pushNotificationService } from '@/services/push-notification.service';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { calculateExpirationAlerts } from '@/utils/warrantyAlerts';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

// POST /api/push-notifications/warranty-alerts - Enviar alertas de garantía
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens, subscriptions, topic } = body;

    // Obtener órdenes para calcular alertas
    const ordersResult = await repairOrderRepository.findAll();
    
    if (!ordersResult.success || !ordersResult.data) {
      return NextResponse.json(
        { success: false, error: 'Error obteniendo órdenes de reparación' },
        { status: 500 }
      );
    }

    const orders = ordersResult.data;
    const alertsData = calculateExpirationAlerts(orders, 30);

    if (alertsData.warrantyAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        data: { alertCount: 0 },
        message: 'No hay alertas de garantía para enviar'
      });
    }

    const results = {
      webPush: { sent: 0, failed: 0, errors: [] as string[] },
      fcm: { sent: 0, failed: 0, errors: [] as string[] },
      topic: { sent: 0, failed: 0, errors: [] as string[] }
    };

    // Enviar alertas críticas
    for (const alert of alertsData.warrantyAlerts.filter(a => a.severity === 'critical')) {
      const payload = pushNotificationService.generateWarrantyAlertPayload(
        alert.type,
        alert.severity,
        alert.folio,
        alert.clientName,
        alert.daysRemaining
      );

      // Enviar a suscripciones web
      if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          try {
            const result = await pushNotificationService.sendWebPush(subscription, payload);
            if (result.success) {
              results.webPush.sent++;
            } else {
              results.webPush.failed++;
              results.webPush.errors.push(result.error || 'Unknown error');
            }
          } catch (error) {
            results.webPush.failed++;
            results.webPush.errors.push(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }

      // Enviar a tokens FCM
      if (tokens && tokens.length > 0) {
        const fcmPayload = {
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.image
          },
          data: payload.data || {}
        };

        const multicastResult = await pushNotificationService.sendMulticast(
          tokens,
          fcmPayload.notification,
          fcmPayload.data
        );

        results.fcm.sent += multicastResult.successCount;
        results.fcm.failed += multicastResult.failureCount;
        results.fcm.errors.push(...multicastResult.errors);
      }

      // Enviar a topic
      if (topic) {
        try {
          const topicResult = await pushNotificationService.sendToTopic(
            topic,
            {
              title: payload.title,
              body: payload.body,
              imageUrl: payload.image
            },
            payload.data || {}
          );

          if (topicResult.success) {
            results.topic.sent++;
          } else {
            results.topic.failed++;
            results.topic.errors.push(topicResult.error || 'Unknown error');
          }
        } catch (error) {
          results.topic.failed++;
          results.topic.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alertCount: alertsData.warrantyAlerts.length,
        criticalAlerts: alertsData.warrantyAlerts.filter(a => a.severity === 'critical').length,
        results
      },
      message: 'Alertas de garantía enviadas'
    });

  } catch (error) {
    console.error('Error sending warranty alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Error enviando alertas de garantía' },
      { status: 500 }
    );
  }
}