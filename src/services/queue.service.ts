import { QueueServiceClient, QueueClient, StorageSharedKeyCredential } from '@azure/storage-queue';
import { ScheduledPushNotification } from '@/types/push-notification';
import { logWithCSTTime } from '@/utils/timezone';
import { DateTime } from 'luxon';

const QUEUE_NAME = 'notifications';

// Función para obtener el cliente de queue (lazy initialization)
function getQueueClient(): QueueClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING no está configurada');
  }
  
  try {
    // Opción 1: Usar la URL directa del queue
    const queueUrl = `https://workshop.queue.core.windows.net/${QUEUE_NAME}`;
    
    // Extraer AccountKey del connection string
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
    if (!accountKeyMatch) {
      throw new Error('No se pudo extraer AccountKey del connection string');
    }
    
    const accountKey = accountKeyMatch[1];
    
    // Crear cliente usando URL directa y StorageSharedKeyCredential
    const credential = new StorageSharedKeyCredential('workshop', accountKey);
    
    console.log('🔗 Conectando a Azure Queue URL:', queueUrl);
    return new QueueClient(queueUrl, credential);
    
  } catch (error) {
    console.error('❌ Error creando cliente de Azure Storage:', error);
    
    // Fallback: intentar con connection string original
    try {
      console.log('🔄 Intentando fallback con connection string...');
      const queueServiceClient = new QueueServiceClient(connectionString);
      return queueServiceClient.getQueueClient(QUEUE_NAME);
    } catch (fallbackError) {
      console.error('❌ Fallback también falló:', fallbackError);
      throw new Error(`Error de conexión a Azure Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export interface QueuedNotification {
  id: string;
  notificationType: string;
  scheduledTime: string; // ISO string
  payload: {
    title: string;
    body: string;
    data?: any;
    icon?: string;
    tag?: string;
  };
  metadata: {
    createdAt: string;
    retryCount: number;
    maxRetries: number;
  };
}

export class NotificationQueueService {
  /**
   * Inicializar el queue (crear si no existe)
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔧 Inicializando queue de notificaciones...');
      
      // Crear el queue si no existe
      const queueClient = getQueueClient();
      await queueClient.createIfNotExists();
      
      console.log('✅ Queue de notificaciones inicializado');
    } catch (error) {
      console.error('❌ Error inicializando queue:', error);
      throw error;
    }
  }

  /**
   * Encolar una notificación para ejecución programada
   */
  static async enqueueNotification(
    notification: ScheduledPushNotification,
    scheduledTime: Date | string
  ): Promise<void> {
    try {
      console.log('📤 Encolando notificación:', {
        id: notification.id,
        type: notification.notificationType,
        scheduledTime: typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString()
      });

      // Preparar el payload para la queue
      const queuedNotification: QueuedNotification = {
        id: notification.id,
        notificationType: notification.notificationType,
        scheduledTime: typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString(),
        payload: {
          title: notification.template.title,
          body: notification.template.body,
          data: notification.template.data,
          icon: notification.template.icon,
          tag: `notification_${notification.notificationType}`
        },
        metadata: {
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      };

      // Calcular el delay hasta la ejecución programada usando Luxon
      const nowCST = DateTime.now().setZone('America/Mexico_City');
      
      // Parsear scheduledTime usando Luxon
      let scheduledDateTime: DateTime;
      if (typeof scheduledTime === 'string') {
        // El string está en formato CST (2025-07-29T20:09:00.000)
        scheduledDateTime = DateTime.fromISO(scheduledTime, { zone: 'America/Mexico_City' });
      } else {
        scheduledDateTime = DateTime.fromJSDate(scheduledTime).setZone('America/Mexico_City');
      }
      
      const delayInSeconds = Math.max(0, Math.floor(scheduledDateTime.diff(nowCST, 'seconds').seconds));

      // Encolar el mensaje con delay
      const queueClient = getQueueClient();
      const messageText = JSON.stringify(queuedNotification);
      const result = await queueClient.sendMessage(
        messageText,
        {
          visibilityTimeout: delayInSeconds, // El mensaje será visible después del delay
          messageTimeToLive: 7 * 24 * 60 * 60 // 7 días en segundos
        }
      );

      logWithCSTTime('✅ Notificación encolada:', {
        messageId: result.messageId,
        delayInSeconds,
        scheduledFor: typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString(),
        scheduledDateTime: scheduledDateTime.toISO(),
        currentTimeCST: nowCST.toISO(),
        delayHours: Math.round(delayInSeconds / 3600)
      });

    } catch (error) {
      console.error('❌ Error encolando notificación:', error);
      throw error;
    }
  }

  /**
   * Procesar mensajes de la queue (ejecutar notificaciones programadas)
   */
  static async processQueueMessages(): Promise<void> {
    try {
      logWithCSTTime('🔄 Procesando mensajes de la queue...');

      // Obtener mensajes de la queue
      const queueClient = getQueueClient();
      const response = await queueClient.receiveMessages({
        numberOfMessages: 10, // Procesar hasta 10 mensajes a la vez
        visibilityTimeout: 300  // 5 minutos para procesar cada mensaje (era 30 segundos)
      });

      if (response.receivedMessageItems.length === 0) {
        logWithCSTTime('📭 No hay mensajes en la queue');
        return;
      }

      logWithCSTTime(`📨 Encontrados ${response.receivedMessageItems.length} mensajes para procesar`);

      // Procesar cada mensaje SECUENCIALMENTE para evitar conflictos
      for (const message of response.receivedMessageItems) {
        try {
          logWithCSTTime(`🚀 Procesando mensaje: ${message.messageId}`);
          
          // IMPORTANTE: Procesar el mensaje 
          const success = await this.processMessage(message);
          
          if (success) {
            // Solo eliminar si el procesamiento fue exitoso
            await queueClient.deleteMessage(message.messageId, message.popReceipt);
            logWithCSTTime(`✅ Mensaje ${message.messageId} procesado y eliminado exitosamente`);
          } else {
            logWithCSTTime(`❌ Mensaje ${message.messageId} falló al procesarse, se reintentará automáticamente`);
          }
          
        } catch (error) {
          logWithCSTTime(`❌ Error procesando mensaje ${message.messageId}:`, error);
          // El mensaje permanecerá en la queue para reintento automático
        }
      }

    } catch (error) {
      logWithCSTTime('❌ Error procesando queue:', error);
    }
  }

  /**
   * Procesar un mensaje individual
   * @returns true si el procesamiento fue exitoso, false si falló
   */
  private static async processMessage(message: any): Promise<boolean> {
    try {
      const queuedNotification: QueuedNotification = JSON.parse(message.messageText);
      
      logWithCSTTime('📋 Ejecutando notificación:', {
        id: queuedNotification.id,
        type: queuedNotification.notificationType,
        scheduledTime: queuedNotification.scheduledTime
      });

      // Verificar que es hora de ejecutar esta notificación usando Luxon
      const scheduledDateTime = DateTime.fromISO(queuedNotification.scheduledTime, { zone: 'America/Mexico_City' });
      const nowCST = DateTime.now().setZone('America/Mexico_City');
      
      if (scheduledDateTime > nowCST) {
        logWithCSTTime(`⏰ Notificación ${queuedNotification.id} aún no es hora de ejecutar. Scheduled: ${scheduledDateTime.toISO()}, Now: ${nowCST.toISO()}`);
        return false; // No es hora aún, el mensaje volverá a la queue
      }

      // Ejecutar la notificación
      const executionSuccess = await this.executeNotification(queuedNotification);

      if (executionSuccess) {
        logWithCSTTime(`✅ Notificación ${queuedNotification.id} ejecutada exitosamente`);
        return true; // Éxito - se puede eliminar el mensaje
      } else {
        logWithCSTTime(`❌ Notificación ${queuedNotification.id} falló al ejecutarse`);
        return false; // Falló - mantener en queue para reintento
      }

    } catch (error) {
      logWithCSTTime('❌ Error procesando mensaje:', error);
      return false; // Error - mantener en queue para reintento
    }
  }

  /**
   * Ejecutar una notificación
   * @returns true si la ejecución fue exitosa, false si falló
   */
  private static async executeNotification(queuedNotification: QueuedNotification): Promise<boolean> {
    try {
      logWithCSTTime(`🚀 Enviando notificación push para: ${queuedNotification.notificationType}`);

      // Llamar al endpoint de notificaciones automáticas
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push-notifications/send-auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: queuedNotification.notificationType,
          title: queuedNotification.payload.title,
          body: queuedNotification.payload.body,
          data: queuedNotification.payload.data
        })
      });

      if (!response.ok) {
        logWithCSTTime(`❌ Error HTTP al enviar notificación: ${response.status} - ${response.statusText}`);
        await this.updateNotificationStats(queuedNotification.id, false);
        return false;
      }

      const result = await response.json();
      logWithCSTTime('📱 Notificación automática enviada exitosamente:', result);

      // Actualizar estadísticas en la base de datos
      await this.updateNotificationStats(queuedNotification.id, true);
      
      return true; // Éxito

    } catch (error) {
      logWithCSTTime('❌ Error ejecutando notificación:', error);
      
      // Actualizar estadísticas con fallo
      await this.updateNotificationStats(queuedNotification.id, false);
      
      return false; // Fallo
    }
  }

  /**
   * Actualizar estadísticas de la notificación en la base de datos
   */
  private static async updateNotificationStats(notificationId: string, success: boolean): Promise<void> {
    try {
      // NOTE: Legacy Cosmos DB logic disabled to fix build
      /*
      const { PushNotificationService } = await import('@/lib/cosmos/push-notifications');
      const notifications = await PushNotificationService.getAllScheduledNotifications();
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        await PushNotificationService.incrementRunCount(notificationId, notification.notificationType, success);
      }
      */
      logWithCSTTime(`📊 Estadísticas: ${notificationId} -> ${success ? 'éxito' : 'fallo'} (Actualización omitida por migración)`);
    } catch (error) {
      logWithCSTTime('❌ Error actualizando estadísticas:', error);
    }
  }

  /**
   * Obtener estadísticas de la queue
   */
  static async getQueueStats(): Promise<{
    approximateMessagesCount: number;
    queueName: string;
    status: 'connected' | 'error';
  }> {
    try {
      const queueClient = getQueueClient();
      const properties = await queueClient.getProperties();
      
      return {
        approximateMessagesCount: properties.approximateMessagesCount || 0,
        queueName: QUEUE_NAME,
        status: 'connected'
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de queue:', error);
      return {
        approximateMessagesCount: 0,
        queueName: QUEUE_NAME,
        status: 'error'
      };
    }
  }

  /**
   * Limpiar mensajes antiguos de la queue
   */
  static async clearQueue(): Promise<void> {
    try {
      console.log('🧹 Limpiando queue de notificaciones...');
      const queueClient = getQueueClient();
      await queueClient.clearMessages();
      console.log('✅ Queue limpiada exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando queue:', error);
      throw error;
    }
  }
}