import webpush from 'web-push';
import admin from 'firebase-admin';

// Configuración de Web Push
const webPushConfig = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  email: process.env.VAPID_SUBJECT || 'mailto:letrasunipoli@gmail.com'
};

// Configuración de Firebase Admin
const firebaseConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL
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

export interface FCMNotificationPayload {
  token: string;
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'normal' | 'high';
    notification: {
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      clickAction?: string;
      bodyLocKey?: string;
      bodyLocArgs?: string[];
      titleLocKey?: string;
      titleLocArgs?: string[];
    };
  };
  apns?: {
    payload: {
      aps: {
        alert?: {
          title?: string;
          body?: string;
          titleLocKey?: string;
          titleLocArgs?: string[];
          bodyLocKey?: string;
          bodyLocArgs?: string[];
        };
        badge?: number;
        sound?: string;
        contentAvailable?: boolean;
        category?: string;
        threadId?: string;
      };
    };
  };
}

class PushNotificationService {
  private firebaseApp: admin.app.App | null = null;
  private isWebPushConfigured = false;
  private isFirebaseConfigured = false;

  constructor() {
    this.initializeServices();
  }

  /**
   * Inicializa los servicios de push notifications
   */
  private initializeServices(): void {
    // Configurar Web Push (para PWA)
    console.log('🔧 Debug Environment Variables:', {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? `${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 20)}...` : 'NOT SET',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ? `${process.env.VAPID_PRIVATE_KEY.substring(0, 20)}...` : 'NOT SET',
      VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'NOT SET'
    });
    
    console.log('🔧 Debug VAPID config:', {
      publicKey: webPushConfig.publicKey ? `${webPushConfig.publicKey.substring(0, 20)}...` : 'NOT SET',
      privateKey: webPushConfig.privateKey ? `${webPushConfig.privateKey.substring(0, 20)}...` : 'NOT SET',
      email: webPushConfig.email
    });

    if (webPushConfig.publicKey && webPushConfig.privateKey) {
      try {
        webpush.setVapidDetails(
          webPushConfig.email,
          webPushConfig.publicKey,
          webPushConfig.privateKey
        );
        this.isWebPushConfigured = true;
        console.log('📱 Web Push service initialized successfully');
      } catch (error) {
        console.warn('⚠️ Web Push initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Web Push not configured (missing VAPID keys)');
    }

    // Configurar Firebase Admin (para móviles nativos)
    if (firebaseConfig.projectId && firebaseConfig.privateKey && firebaseConfig.clientEmail) {
      try {
        // Verificar si ya existe una app inicializada
        if (!admin.apps.length) {
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebaseConfig.projectId,
              privateKey: firebaseConfig.privateKey,
              clientEmail: firebaseConfig.clientEmail
            })
          });
        } else {
          this.firebaseApp = admin.app();
        }
        this.isFirebaseConfigured = true;
        console.log('🔥 Firebase Admin initialized for push notifications');
      } catch (error) {
        console.warn('⚠️ Firebase Admin initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Firebase Admin not configured (missing credentials)');
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
      const options = {
        TTL: 24 * 60 * 60, // 24 horas
        urgency: 'normal' as const,
        headers: {}
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        options
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
   * Envía notificación FCM (Firebase Cloud Messaging)
   */
  async sendFCMNotification(
    payload: FCMNotificationPayload
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return {
        success: false,
        error: 'Firebase service not configured'
      };
    }

    try {
      const message = {
        token: payload.token,
        notification: payload.notification,
        data: payload.data,
        android: payload.android,
        apns: payload.apns
      };

      const messageId = await admin.messaging().send(message);

      return {
        success: true,
        messageId
      };
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Envía notificación a múltiples dispositivos
   */
  async sendMulticast(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
    },
    data?: Record<string, string>
  ): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    errors: string[];
  }> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
        errors: ['Firebase service not configured']
      };
    }

    try {
      const message = {
        tokens,
        notification,
        data
      };

      const response = await admin.messaging().sendMulticast(message);

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .filter((resp, index) => !resp.success)
          .map((resp, index) => `Token ${index}: ${resp.error?.message || 'Unknown error'}`)
      };
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Suscribe un token a un topic
   */
  async subscribeToTopic(
    tokens: string[],
    topic: string
  ): Promise<{
    success: boolean;
    successCount?: number;
    failureCount?: number;
    errors?: string[];
  }> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return {
        success: false,
        errors: ['Firebase service not configured']
      };
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors?.map(error => error.error?.message || 'Unknown error')
      };
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Envía notificación a un topic
   */
  async sendToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
    },
    data?: Record<string, string>
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return {
        success: false,
        error: 'Firebase service not configured'
      };
    }

    try {
      const message = {
        topic,
        notification,
        data
      };

      const messageId = await admin.messaging().send(message);

      return {
        success: true,
        messageId
      };
    } catch (error) {
      console.error('Error sending topic notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Genera payloads específicos para diferentes tipos de alertas
   */
  generateWarrantyAlertPayload(
    type: 'warranty' | 'storage',
    severity: 'warning' | 'critical',
    folio: string,
    clientName: string,
    daysRemaining: number
  ): PushNotificationPayload {
    const basePayload = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      timestamp: Date.now(),
      requireInteraction: severity === 'critical',
      tag: `${type}-${folio}`,
      data: {
        type,
        severity,
        folio,
        clientName,
        daysRemaining: daysRemaining.toString(),
        url: `/repairs?folio=${folio}`
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Orden',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Descartar'
        }
      ]
    };

    if (type === 'warranty') {
      return {
        ...basePayload,
        title: severity === 'critical' 
          ? '🚨 GARANTÍA VENCE PRONTO' 
          : '⚠️ Aviso de Garantía',
        body: `${clientName} - Folio ${folio}\n${severity === 'critical' 
          ? `¡Garantía vence en ${daysRemaining} días!` 
          : `Garantía vence en ${daysRemaining} días`}`,
        image: severity === 'critical' 
          ? '/images/critical-alert.png' 
          : '/images/warning-alert.png'
      };
    } else {
      return {
        ...basePayload,
        title: severity === 'critical' 
          ? '🚨 RECOGER PRODUCTO' 
          : '📦 Recordatorio de Entrega',
        body: `${clientName} - Folio ${folio}\n${severity === 'critical' 
          ? `¡Almacenamiento vence en ${daysRemaining} días!` 
          : `Recordatorio: recoger en ${daysRemaining} días`}`,
        image: '/images/pickup-reminder.png'
      };
    }
  }

  /**
   * Obtiene las claves VAPID públicas para el cliente
   */
  getVapidPublicKey(): string {
    return webPushConfig.publicKey;
  }

  /**
   * Verifica el estado de los servicios
   */
  async getServiceStatus(): Promise<{
    webPush: { configured: boolean; publicKey?: string };
    fcm: { configured: boolean; projectId?: string };
  }> {
    return {
      webPush: {
        configured: this.isWebPushConfigured,
        publicKey: this.isWebPushConfigured ? webPushConfig.publicKey : undefined
      },
      fcm: {
        configured: this.isFirebaseConfigured,
        projectId: this.isFirebaseConfigured ? firebaseConfig.projectId : undefined
      }
    };
  }

  /**
   * Valida un token FCM
   */
  async validateFCMToken(token: string): Promise<boolean> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return false;
    }

    try {
      // Intentar enviar un mensaje de prueba (dry run)
      await admin.messaging().send({
        token,
        data: { test: 'true' }
      }, true); // dry run = true
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup de tokens inválidos
   */
  async cleanupInvalidTokens(tokens: string[]): Promise<string[]> {
    if (!this.isFirebaseConfigured || !this.firebaseApp) {
      return tokens;
    }

    const validTokens: string[] = [];

    for (const token of tokens) {
      const isValid = await this.validateFCMToken(token);
      if (isValid) {
        validTokens.push(token);
      }
    }

    return validTokens;
  }
}

// Exportar instancia singleton
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;