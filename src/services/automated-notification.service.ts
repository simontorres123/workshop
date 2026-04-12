import { RepairOrder } from '@/types/repair';
import { calculateStorageAlerts, StorageAlert } from '@/utils/storageAlerts';
import { calculateExpirationAlerts, WarrantyAlert } from '@/utils/warrantyAlerts';
import { notificationService } from './notification.service';
import { warrantyNotificationService } from './warranty-notification.service';
import { RepositoryFactory } from '@/repositories/repository.factory';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

export interface NotificationRule {
  id: string;
  name: string;
  type: 'storage' | 'warranty' | 'general';
  enabled: boolean;
  conditions: {
    daysRemaining?: number;
    severity?: 'warning' | 'critical';
    deviceTypes?: string[];
    minimumCost?: number;
  };
  actions: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    inApp?: boolean;
    autoCall?: boolean;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'immediate';
    time?: string; // HH:MM format
    days?: number[]; // 0=Sunday, 1=Monday, etc.
  };
  template: {
    subject: string;
    message: string;
  };
  lastRun?: Date;
  nextRun?: Date;
}

class AutomatedNotificationService {
  private rules: NotificationRule[] = [
    {
      id: 'storage-critical',
      name: 'Almacenamiento Crítico',
      type: 'storage',
      enabled: true,
      conditions: {
        daysRemaining: 3,
        severity: 'critical'
      },
      actions: {
        whatsapp: true,
        inApp: true,
        autoCall: true
      },
      schedule: {
        frequency: 'immediate'
      },
      template: {
        subject: '🚨 URGENTE: Aparato debe ser recogido',
        message: 'Su {deviceType} (Folio: {folio}) debe ser recogido INMEDIATAMENTE. Período de almacenamiento gratuito termina en {daysRemaining} días. Costo actual: {cost}.'
      }
    },
    {
      id: 'storage-warning',
      name: 'Alerta de Almacenamiento',
      type: 'storage',
      enabled: true,
      conditions: {
        daysRemaining: 7,
        severity: 'warning'
      },
      actions: {
        whatsapp: true,
        email: true,
        inApp: true
      },
      schedule: {
        frequency: 'daily',
        time: '09:00'
      },
      template: {
        subject: '⏰ Recordatorio: Recoja su aparato reparado',
        message: 'Su {deviceType} (Folio: {folio}) está listo para ser recogido. Le quedan {daysRemaining} días de almacenamiento gratuito.'
      }
    },
    {
      id: 'warranty-expiring',
      name: 'Garantía Próxima a Vencer',
      type: 'warranty',
      enabled: true,
      conditions: {
        daysRemaining: 30,
        severity: 'warning'
      },
      actions: {
        email: true,
        whatsapp: true,
        inApp: true
      },
      schedule: {
        frequency: 'weekly',
        days: [1], // Lunes
        time: '10:00'
      },
      template: {
        subject: '🛡️ Su garantía vence pronto',
        message: 'La garantía de su {deviceType} (Folio: {folio}) vence en {daysRemaining} días. Si tiene algún problema, contáctenos antes de que expire.'
      }
    },
    {
      id: 'high-cost-storage',
      name: 'Costo Alto de Almacenamiento',
      type: 'storage',
      enabled: true,
      conditions: {
        minimumCost: 500
      },
      actions: {
        whatsapp: true,
        autoCall: true,
        inApp: true
      },
      schedule: {
        frequency: 'daily',
        time: '14:00'
      },
      template: {
        subject: '💰 Costo de almacenamiento elevado',
        message: 'Su {deviceType} (Folio: {folio}) ha generado un costo de almacenamiento de {cost}. Para evitar cargos adicionales, recójalo lo antes posible.'
      }
    }
  ];

  private contactHistory = new Map<string, Date>();

  /**
   * Ejecuta todas las reglas de notificación activas
   */
  async processAllNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    console.log('🔄 Iniciando procesamiento de notificaciones automáticas...');
    
    let processed = 0;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Obtener todas las órdenes relevantes
      const [allOrders, repairedOrders] = await Promise.all([
        repairOrderRepository.findAll(),
        repairOrderRepository.getRepairedNotDelivered()
      ]);

      // Calcular alertas
      const storageAlerts = calculateStorageAlerts(repairedOrders);
      const warrantyAlerts = calculateExpirationAlerts(allOrders);

      // Procesar cada regla activa
      for (const rule of this.rules.filter(r => r.enabled)) {
        try {
          processed++;
          
          if (!this.shouldRunRule(rule)) {
            continue;
          }

          let alertsToProcess: (StorageAlert | WarrantyAlert)[] = [];

          // Filtrar alertas según el tipo de regla
          if (rule.type === 'storage') {
            alertsToProcess = this.filterStorageAlerts(storageAlerts.storageAlerts, rule);
          } else if (rule.type === 'warranty') {
            alertsToProcess = this.filterWarrantyAlerts(warrantyAlerts.warrantyAlerts, rule);
          }

          // Procesar cada alerta
          for (const alert of alertsToProcess) {
            try {
              await this.processAlert(alert, rule);
              sent++;
            } catch (error) {
              failed++;
              errors.push(`Error procesando alerta ${alert.folio}: ${error}`);
            }
          }

          // Actualizar última ejecución
          rule.lastRun = new Date();
          rule.nextRun = this.calculateNextRun(rule);

        } catch (error) {
          failed++;
          errors.push(`Error procesando regla ${rule.name}: ${error}`);
        }
      }

      console.log(`✅ Procesamiento completado: ${processed} reglas, ${sent} enviadas, ${failed} fallidas`);

      return { processed, sent, failed, errors };

    } catch (error) {
      console.error('❌ Error en procesamiento de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Procesa una alerta específica según una regla
   */
  private async processAlert(alert: StorageAlert | WarrantyAlert, rule: NotificationRule) {
    const recentContactKey = `${alert.id}-${rule.id}`;
    const lastContact = this.contactHistory.get(recentContactKey);
    
    // Evitar spam - no contactar más de una vez por día por la misma regla
    if (lastContact && (Date.now() - lastContact.getTime()) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Personalizar mensaje
    const personalizedMessage = this.personalizeMessage(rule.template, alert);

    // Enviar notificaciones según las acciones configuradas
    const promises: Promise<any>[] = [];

    if (rule.actions.whatsapp) {
      promises.push(this.sendWhatsAppMessage(alert, personalizedMessage));
    }

    if (rule.actions.email) {
      promises.push(this.sendEmailNotification(alert, personalizedMessage));
    }

    if (rule.actions.sms) {
      promises.push(this.sendSMSNotification(alert, personalizedMessage));
    }

    if (rule.actions.inApp) {
      promises.push(this.createInAppNotification(alert, personalizedMessage));
    }

    if (rule.actions.autoCall) {
      promises.push(this.scheduleAutoCall(alert, personalizedMessage));
    }

    // Ejecutar todas las acciones en paralelo
    await Promise.allSettled(promises);

    // Marcar como contactado
    // await markOrderAsContacted(alert.id, 'automated-notification', `Regla: ${rule.name}`);
    this.contactHistory.set(recentContactKey, new Date());

    console.log(`📤 Notificación enviada: ${alert.folio} - ${rule.name}`);
  }

  /**
   * Envía mensaje de WhatsApp
   */
  private async sendWhatsAppMessage(alert: StorageAlert | WarrantyAlert, message: { subject: string; message: string }) {
    try {
      // Aquí integrarías con tu API de WhatsApp (Twilio, WhatsApp Business API, etc.)
      const phoneNumber = await this.getClientPhone(alert.id);
      
      // Simular envío de WhatsApp
      console.log(`📱 WhatsApp enviado a ${phoneNumber}: ${message.message}`);
      
      // En producción:
      // await whatsappService.sendMessage(phoneNumber, message.message);
      
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Envía notificación por email
   */
  private async sendEmailNotification(alert: StorageAlert | WarrantyAlert, message: { subject: string; message: string }) {
    try {
      const clientEmail = await this.getClientEmail(alert.id);
      
      if (clientEmail) {
        await notificationService.sendEmail(
          clientEmail,
          message.subject,
          message.message
        );
        console.log(`📧 Email enviado a ${clientEmail}`);
      }
      
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Envía notificación por SMS
   */
  private async sendSMSNotification(alert: StorageAlert | WarrantyAlert, message: { subject: string; message: string }) {
    try {
      const phoneNumber = await this.getClientPhone(alert.id);
      
      await notificationService.sendSMS(
        phoneNumber,
        `${message.subject}\n\n${message.message.substring(0, 140)}...`
      );
      console.log(`📱 SMS enviado a ${phoneNumber}`);
      
    } catch (error) {
      console.error('Error enviando SMS:', error);
      throw error;
    }
  }

  /**
   * Crea notificación in-app
   */
  private async createInAppNotification(alert: StorageAlert | WarrantyAlert, message: { subject: string; message: string }) {
    try {
      // Guardar en base de datos para mostrar en la interfaz
      const notification = {
        id: `notification-${Date.now()}-${alert.id}`,
        type: alert.type,
        severity: alert.severity,
        orderId: alert.id,
        folio: alert.folio,
        subject: message.subject,
        body: message.message,
        read: false,
        createdAt: new Date(),
        expiresAt: alert.expirationDate
      };

      // En producción, guardar en base de datos
      console.log('🔔 Notificación in-app creada:', notification);
      
    } catch (error) {
      console.error('Error creando notificación in-app:', error);
      throw error;
    }
  }

  /**
   * Programa llamada automática
   */
  private async scheduleAutoCall(alert: StorageAlert | WarrantyAlert, message: { subject: string; message: string }) {
    try {
      const phoneNumber = await this.getClientPhone(alert.id);
      
      // Aquí integrarías con un servicio de llamadas automáticas
      const callSchedule = {
        phoneNumber,
        message: message.message,
        scheduledFor: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos después
        attempts: 0,
        maxAttempts: 3
      };

      console.log('📞 Llamada automática programada:', callSchedule);
      
      // En producción:
      // await callService.scheduleCall(callSchedule);
      
    } catch (error) {
      console.error('Error programando llamada:', error);
      throw error;
    }
  }

  /**
   * Filtra alertas de almacenamiento según las condiciones de la regla
   */
  private filterStorageAlerts(alerts: StorageAlert[], rule: NotificationRule): StorageAlert[] {
    return alerts.filter(alert => {
      if (rule.conditions.daysRemaining !== undefined) {
        if (alert.daysRemaining > rule.conditions.daysRemaining) return false;
      }

      if (rule.conditions.severity && alert.severity !== rule.conditions.severity) {
        return false;
      }

      if (rule.conditions.deviceTypes && !rule.conditions.deviceTypes.includes(alert.deviceType)) {
        return false;
      }

      if (rule.conditions.minimumCost && (alert.estimatedCost || 0) < rule.conditions.minimumCost) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filtra alertas de garantía según las condiciones de la regla
   */
  private filterWarrantyAlerts(alerts: WarrantyAlert[], rule: NotificationRule): WarrantyAlert[] {
    return alerts.filter(alert => {
      if (rule.conditions.daysRemaining !== undefined) {
        if (alert.daysRemaining > rule.conditions.daysRemaining) return false;
      }

      if (rule.conditions.severity && alert.severity !== rule.conditions.severity) {
        return false;
      }

      if (rule.conditions.deviceTypes && !rule.conditions.deviceTypes.includes(alert.deviceType)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Personaliza el mensaje con datos de la alerta
   */
  private personalizeMessage(template: { subject: string; message: string }, alert: StorageAlert | WarrantyAlert) {
    const replacements = {
      '{deviceType}': alert.deviceType,
      '{folio}': alert.folio,
      '{clientName}': alert.clientName,
      '{daysRemaining}': Math.abs(alert.daysRemaining).toString(),
      '{expirationDate}': alert.expirationDate.toLocaleDateString('es-MX'),
      '{cost}': alert.type === 'storage' && (alert as StorageAlert).estimatedCost ? 
        `$${(alert as StorageAlert).estimatedCost!.toLocaleString()}` : '$0'
    };

    let subject = template.subject;
    let message = template.message;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, message };
  }

  /**
   * Determina si una regla debe ejecutarse
   */
  private shouldRunRule(rule: NotificationRule): boolean {
    const now = new Date();

    if (rule.schedule.frequency === 'immediate') {
      return true;
    }

    if (!rule.lastRun) {
      return true;
    }

    if (rule.nextRun && now >= rule.nextRun) {
      return true;
    }

    return false;
  }

  /**
   * Calcula la próxima ejecución de una regla
   */
  private calculateNextRun(rule: NotificationRule): Date {
    const now = new Date();

    switch (rule.schedule.frequency) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (rule.schedule.time) {
          const [hours, minutes] = rule.schedule.time.split(':').map(Number);
          tomorrow.setHours(hours, minutes, 0, 0);
        }
        return tomorrow;

      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        if (rule.schedule.time) {
          const [hours, minutes] = rule.schedule.time.split(':').map(Number);
          nextWeek.setHours(hours, minutes, 0, 0);
        }
        return nextWeek;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas después
    }
  }

  /**
   * Obtiene el teléfono del cliente para una orden
   */
  private async getClientPhone(orderId: string): Promise<string> {
    // En producción, consultar la base de datos
    // const order = await getOrderById(orderId);
    // return order.clientPhone;
    
    // Simulación
    return '+52555123456';
  }

  /**
   * Obtiene el email del cliente para una orden
   */
  private async getClientEmail(orderId: string): Promise<string | null> {
    // En producción, consultar la base de datos
    // const order = await getOrderById(orderId);
    // return order.clientEmail;
    
    // Simulación
    return 'cliente@example.com';
  }

  /**
   * Obtiene las reglas de notificación
   */
  getRules(): NotificationRule[] {
    return [...this.rules];
  }

  /**
   * Actualiza una regla de notificación
   */
  updateRule(ruleId: string, updates: Partial<NotificationRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  /**
   * Agrega una nueva regla
   */
  addRule(rule: NotificationRule): void {
    this.rules.push(rule);
  }

  /**
   * Elimina una regla
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }
}

export const automatedNotificationService = new AutomatedNotificationService();
export default automatedNotificationService;