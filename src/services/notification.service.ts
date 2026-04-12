import { RepairOrder } from '@/types';

// Aquí se podría usar un SDK como @sendgrid/mail o resend

export class NotificationService {
  async sendEmail(email: string, subject: string, body: string): Promise<void> {
    try {
      const { externalNotificationService } = await import('./external-notification.service');
      
      const result = await externalNotificationService.sendEmail({
        to: email,
        subject,
        text: body,
        html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${body}</pre>`
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendSMS(phone: string, message: string): Promise<void> {
    try {
      const { externalNotificationService } = await import('./external-notification.service');
      
      const result = await externalNotificationService.sendSMS({
        to: phone,
        body: message
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    try {
      const { externalNotificationService } = await import('./external-notification.service');
      
      const result = await externalNotificationService.sendWhatsApp({
        to: phone,
        message,
        type: 'text'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      throw error;
    }
  }

  async sendRepairStatusUpdate(email: string, repairOrder: RepairOrder) {
    const { folio, status, statusNotes } = repairOrder;
    
    // Obtener la última nota si existe
    let latestNote = '';
    if (Array.isArray(statusNotes) && statusNotes.length > 0) {
      const sortedNotes = statusNotes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      latestNote = sortedNotes[0].note || '';
    } else if (typeof statusNotes === 'string') {
      latestNote = statusNotes;
    }

    const subject = `Actualización de tu reparación con folio: ${folio}`;
    const body = `Hola,

El estado de tu reparación ha cambiado a: ${status}

${latestNote ? `Notas del técnico: ${latestNote}` : ''}

Folio: ${folio}
Fecha de actualización: ${new Date().toLocaleString('es-MX')}

Gracias por confiar en nosotros.

Workshop Pro
${process.env.BUSINESS_PHONE || ''}
${process.env.BUSINESS_EMAIL || ''}`;

    try {
      await this.sendEmail(email, subject, body);
      return { success: true };
    } catch (error) {
      console.error('Error sending repair status update:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const notificationService = new NotificationService();
