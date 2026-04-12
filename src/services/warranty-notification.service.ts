import { RepairOrder } from '@/types/repair';
import { calculateExpirationAlerts, WarrantyAlert } from '@/utils/warrantyAlerts';
import { notificationService } from './notification.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  type: 'warranty' | 'storage';
  severity: 'warning' | 'critical';
}

class WarrantyNotificationService {
  private templates: Record<string, NotificationTemplate> = {
    'warranty-warning': {
      subject: '⚠️ Aviso: Garantía próxima a vencer',
      body: `Estimado cliente,
      
Le informamos que la garantía de su {deviceType} (Folio: {folio}) está próxima a vencer.

📅 Fecha de vencimiento: {expirationDate}
⏰ Días restantes: {daysRemaining}

Si experimenta algún problema con su aparato reparado, le recomendamos que se comunique con nosotros antes de que expire la garantía.

📞 Teléfono: [SU_TELEFONO]
📧 Email: [SU_EMAIL]
📍 Dirección: [SU_DIRECCION]

Gracias por confiar en nuestros servicios.

Atentamente,
El equipo de [NOMBRE_TALLER]`,
      type: 'warranty',
      severity: 'warning'
    },

    'warranty-critical': {
      subject: '🚨 URGENTE: Garantía vence en {daysRemaining} días',
      body: `Estimado cliente,
      
Su garantía está por expirar muy pronto.

🔧 Dispositivo: {deviceType}
📋 Folio: {folio}
📅 Vence: {expirationDate}
⏰ Quedan: {daysRemaining} días

⚠️ IMPORTANTE: Después de esta fecha, cualquier reparación tendrá costo adicional.

Si necesita hacer válida su garantía, contáctenos INMEDIATAMENTE:

📞 Llamar ahora: [SU_TELEFONO]
💬 WhatsApp: [SU_WHATSAPP]

No pierda esta oportunidad.

Atentamente,
[NOMBRE_TALLER]`,
      type: 'warranty',
      severity: 'critical'
    },

    'storage-warning': {
      subject: '📦 Recordatorio: Recoja su aparato reparado',
      body: `Estimado cliente,
      
Su {deviceType} ha sido reparado y está listo para entregar.

📋 Folio: {folio}
📅 Fecha límite de almacenamiento: {expirationDate}
⏰ Días restantes: {daysRemaining}

Por favor, acérquese a recoger su aparato antes de la fecha límite para evitar costos adicionales de almacenamiento.

🕒 Horarios de atención:
Lunes a Viernes: 9:00 AM - 6:00 PM
Sábados: 9:00 AM - 2:00 PM

📍 Dirección: [SU_DIRECCION]
📞 Teléfono: [SU_TELEFONO]

Gracias por su preferencia.

Atentamente,
[NOMBRE_TALLER]`,
      type: 'storage',
      severity: 'warning'
    },

    'storage-critical': {
      subject: '🚨 URGENTE: Recoja su aparato - Vence en {daysRemaining} días',
      body: `AVISO URGENTE

Su aparato debe ser recogido en los próximos {daysRemaining} días.

🔧 Dispositivo: {deviceType}
📋 Folio: {folio}
📅 Fecha límite: {expirationDate}

⚠️ IMPORTANTE: Después de esta fecha se aplicarán cargos por almacenamiento extendido.

📞 Contáctenos AHORA: [SU_TELEFONO]
📍 Ubicación: [SU_DIRECCION]

No espere más, su aparato está listo.

[NOMBRE_TALLER]`,
      type: 'storage',
      severity: 'critical'
    }
  };

  /**
   * Procesa todas las órdenes y envía notificaciones de vencimiento
   */
  async processExpirationNotifications(
    orders: RepairOrder[],
    preferences: NotificationPreferences = {
      email: true,
      sms: false,
      whatsapp: false,
      inApp: true
    }
  ): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const alerts = calculateExpirationAlerts(orders);
    const allAlerts = [...alerts.warrantyAlerts, ...alerts.storageAlerts];
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const alert of allAlerts) {
      try {
        await this.sendAlertNotification(alert, preferences);
        sent++;
      } catch (error) {
        failed++;
        errors.push(`Error enviando notificación para ${alert.folio}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return { sent, failed, errors };
  }

  /**
   * Envía notificación para una alerta específica
   */
  private async sendAlertNotification(
    alert: WarrantyAlert,
    preferences: NotificationPreferences
  ): Promise<void> {
    const templateKey = `${alert.type}-${alert.severity}`;
    const template = this.templates[templateKey];

    if (!template) {
      throw new Error(`Template no encontrado para ${templateKey}`);
    }

    const personalizedMessage = this.personalizeTemplate(template, alert);

    // Enviar email si está habilitado
    if (preferences.email) {
      await notificationService.sendEmail(
        'cliente@example.com', // TODO: Obtener email del cliente de la orden
        personalizedMessage.subject,
        personalizedMessage.body
      );
    }

    // Enviar SMS si está habilitado
    if (preferences.sms) {
      await notificationService.sendSMS(
        '+525551234567', // TODO: Obtener teléfono del cliente
        `${personalizedMessage.subject}\n\n${personalizedMessage.body.substring(0, 150)}...`
      );
    }

    // Enviar WhatsApp si está habilitado
    if (preferences.whatsapp) {
      await notificationService.sendWhatsApp(
        '+525551234567', // TODO: Obtener WhatsApp del cliente
        personalizedMessage.body
      );
    }

    // Guardar notificación in-app si está habilitado
    if (preferences.inApp) {
      await this.saveInAppNotification(alert, personalizedMessage);
    }
  }

  /**
   * Personaliza un template con los datos de la alerta
   */
  private personalizeTemplate(
    template: NotificationTemplate,
    alert: WarrantyAlert
  ): { subject: string; body: string } {
    const replacements = {
      '{deviceType}': alert.deviceType,
      '{folio}': alert.folio,
      '{clientName}': alert.clientName,
      '{daysRemaining}': alert.daysRemaining.toString(),
      '{expirationDate}': format(alert.expirationDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, body };
  }

  /**
   * Guarda una notificación in-app para mostrar en la interfaz
   */
  private async saveInAppNotification(
    alert: WarrantyAlert,
    message: { subject: string; body: string }
  ): Promise<void> {
    // TODO: Implementar guardado en base de datos para notificaciones in-app
    // Esto podría guardarse en una colección de notificaciones en Cosmos DB
    
    const notification = {
      id: `notification-${Date.now()}-${alert.id}`,
      type: alert.type,
      severity: alert.severity,
      orderId: alert.id,
      folio: alert.folio,
      subject: message.subject,
      body: message.body,
      read: false,
      createdAt: new Date(),
      expiresAt: alert.expirationDate
    };

    // Aquí se guardaría en la base de datos
    console.log('In-app notification would be saved:', notification);
  }

  /**
   * Programa notificaciones automáticas para una fecha específica
   */
  async scheduleNotifications(
    orders: RepairOrder[],
    scheduledDate: Date,
    preferences?: NotificationPreferences
  ): Promise<void> {
    // TODO: Implementar programación de notificaciones
    // Esto podría usar un job scheduler como node-cron o integración con Azure Functions
    
    const alerts = calculateExpirationAlerts(orders);
    
    console.log(`Scheduling ${alerts.totalAlerts} notifications for ${scheduledDate}`);
    console.log('Critical alerts:', alerts.criticalAlerts);
  }

  /**
   * Obtiene estadísticas de notificaciones enviadas
   */
  async getNotificationStats(dateRange: { from: Date; to: Date }): Promise<{
    totalSent: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    successRate: number;
  }> {
    // TODO: Implementar obtención de estadísticas desde la base de datos
    
    return {
      totalSent: 0,
      byType: {
        warranty: 0,
        storage: 0
      },
      bySeverity: {
        warning: 0,
        critical: 0
      },
      successRate: 0
    };
  }

  /**
   * Valida configuración de notificaciones
   */
  validateNotificationConfig(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verificar que existan las configuraciones necesarias
    if (!process.env.SMTP_HOST) {
      errors.push('SMTP_HOST no configurado para envío de emails');
    }

    if (!process.env.SMS_API_KEY) {
      errors.push('SMS_API_KEY no configurado para envío de SMS');
    }

    if (!process.env.WHATSAPP_API_TOKEN) {
      errors.push('WHATSAPP_API_TOKEN no configurado para WhatsApp');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const warrantyNotificationService = new WarrantyNotificationService();
export default warrantyNotificationService;