import webpush from 'web-push';

// Configuración de Web Push
const webPushConfig = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  email: process.env.VAPID_SUBJECT || 'mailto:letrasunipoli@gmail.com'
};

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
}

/**
 * Servicio de notificaciones push migrado únicamente a Web Push (VAPID).
 * Se eliminó la dependencia de Firebase para aligerar el build.
 */
class PushNotificationService {
  private isWebPushConfigured = false;

  constructor() {
    this.initializeServices();
  }

  /**
   * Inicializa el servicio de Web Push
   */
  private initializeServices(): void {
    if (webPushConfig.publicKey && webPushConfig.privateKey) {
      try {
        webpush.setVapidDetails(
          webPushConfig.email,
          webPushConfig.publicKey,
          webPushConfig.privateKey
        );
        this.isWebPushConfigured = true;
        console.log('📱 Web Push service initialized successfully (Light Mode)');
      } catch (error) {
        console.warn('⚠️ Web Push initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Web Push not configured (missing VAPID keys)');
    }
  }

  /**
   * Envía notificación push web (PWA)
   */
  async sendWebPush(
    subscription: PushSubscription,
    payload: PushNotificationPayload
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isWebPushConfigured) {
      return {
        success: false,
        error: 'Web Push service not configured'
      };
    }

    try {
      await webpush.sendNotification(
        subscription as any,
        JSON.stringify(payload)
      );
      return { success: true };
    } catch (error) {
      console.error('Error sending web push notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Genera payloads específicos para alertas (Versión Ligera)
   */
  generateWarrantyAlertPayload(
    type: 'warranty' | 'storage',
    severity: 'warning' | 'critical',
    folio: string,
    clientName: string,
    daysRemaining: number
  ): PushNotificationPayload {
    return {
      title: severity === 'critical' ? `🚨 ${type.toUpperCase()} CRÍTICA` : `⚠️ Aviso de ${type}`,
      body: `${clientName} - Folio ${folio}. Faltan ${daysRemaining} días.`,
      icon: '/icons/icon-192x192.png',
      data: { url: `/repairs?folio=${folio}` }
    };
  }

  getVapidPublicKey(): string {
    return webPushConfig.publicKey;
  }

  async getServiceStatus(): Promise<{
    webPush: { configured: boolean; publicKey?: string };
  }> {
    return {
      webPush: {
        configured: this.isWebPushConfigured,
        publicKey: this.isWebPushConfigured ? webPushConfig.publicKey : undefined
      }
    };
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
