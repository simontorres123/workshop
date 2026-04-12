import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Configuración de Email (SMTP)
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Configuración de Twilio (SMS)
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER
};

// Configuración de WhatsApp Business API
const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
};

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface SMSOptions {
  to: string;
  body: string;
}

export interface WhatsAppOptions {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateParams?: string[];
}

class ExternalNotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    this.initializeServices();
  }

  /**
   * Inicializa los servicios externos
   */
  private initializeServices(): void {
    // Inicializar Email (SMTP)
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        this.emailTransporter = nodemailer.createTransporter(emailConfig);
        console.log('📧 Email service initialized');
      } catch (error) {
        console.warn('⚠️ Email service initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Email service not configured (missing SMTP credentials)');
    }

    // Inicializar Twilio (SMS)
    if (twilioConfig.accountSid && twilioConfig.authToken) {
      try {
        this.twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);
        console.log('📱 SMS service initialized');
      } catch (error) {
        console.warn('⚠️ SMS service initialization failed:', error);
      }
    } else {
      console.warn('⚠️ SMS service not configured (missing Twilio credentials)');
    }

    // WhatsApp Business API
    if (whatsappConfig.accessToken && whatsappConfig.phoneNumberId) {
      console.log('📲 WhatsApp service configured');
    } else {
      console.warn('⚠️ WhatsApp service not configured (missing API credentials)');
    }
  }

  /**
   * Envía un email
   */
  async sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.emailTransporter) {
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Workshop Pro'}" <${emailConfig.auth.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        attachments: options.attachments
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Envía un SMS usando Twilio
   */
  async sendSMS(options: SMSOptions): Promise<{
    success: boolean;
    sid?: string;
    error?: string;
  }> {
    if (!this.twilioClient || !twilioConfig.fromNumber) {
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    try {
      // Formatear número de teléfono
      const toNumber = this.formatPhoneNumber(options.to);

      const message = await this.twilioClient.messages.create({
        body: options.body,
        from: twilioConfig.fromNumber,
        to: toNumber
      });

      return {
        success: true,
        sid: message.sid
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Envía un mensaje de WhatsApp usando la API de Business
   */
  async sendWhatsApp(options: WhatsAppOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
      return {
        success: false,
        error: 'WhatsApp service not configured'
      };
    }

    try {
      const phoneNumber = this.formatPhoneNumber(options.to, true);
      
      let payload: any;

      if (options.type === 'template' && options.templateName) {
        // Mensaje con template
        payload = {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: options.templateName,
            language: {
              code: 'es_MX'
            },
            components: options.templateParams ? [{
              type: 'body',
              parameters: options.templateParams.map(param => ({
                type: 'text',
                text: param
              }))
            }] : []
          }
        };
      } else {
        // Mensaje de texto simple
        payload = {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: options.message
          }
        };
      }

      const response = await fetch(
        `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'WhatsApp API error');
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verifica el estado de los servicios
   */
  async checkServiceStatus(): Promise<{
    email: { available: boolean; error?: string };
    sms: { available: boolean; error?: string };
    whatsapp: { available: boolean; error?: string };
  }> {
    const status = {
      email: { available: false },
      sms: { available: false },
      whatsapp: { available: false }
    };

    // Verificar Email
    if (this.emailTransporter) {
      try {
        await this.emailTransporter.verify();
        status.email.available = true;
      } catch (error) {
        status.email.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      status.email.error = 'Service not configured';
    }

    // Verificar SMS (Twilio)
    if (this.twilioClient) {
      try {
        await this.twilioClient.api.accounts(twilioConfig.accountSid).fetch();
        status.sms.available = true;
      } catch (error) {
        status.sms.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      status.sms.error = 'Service not configured';
    }

    // Verificar WhatsApp
    if (whatsappConfig.accessToken && whatsappConfig.phoneNumberId) {
      try {
        const response = await fetch(
          `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${whatsappConfig.accessToken}`
            }
          }
        );

        if (response.ok) {
          status.whatsapp.available = true;
        } else {
          status.whatsapp.error = 'API verification failed';
        }
      } catch (error) {
        status.whatsapp.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      status.whatsapp.error = 'Service not configured';
    }

    return status;
  }

  /**
   * Formatea un número de teléfono para los servicios
   */
  private formatPhoneNumber(phone: string, whatsapp: boolean = false): string {
    // Remover caracteres no numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Si es un número mexicano sin código de país, agregarlo
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      cleaned = '52' + cleaned;
    }
    
    // Para WhatsApp no incluir el +
    return whatsapp ? cleaned : '+' + cleaned;
  }

  /**
   * Obtiene las configuraciones disponibles (sin credenciales sensibles)
   */
  getConfiguration(): {
    email: { configured: boolean; host?: string; port?: number };
    sms: { configured: boolean; fromNumber?: string };
    whatsapp: { configured: boolean; businessAccountId?: string };
  } {
    return {
      email: {
        configured: !!this.emailTransporter,
        host: emailConfig.host,
        port: emailConfig.port
      },
      sms: {
        configured: !!this.twilioClient,
        fromNumber: twilioConfig.fromNumber
      },
      whatsapp: {
        configured: !!(whatsappConfig.accessToken && whatsappConfig.phoneNumberId),
        businessAccountId: whatsappConfig.businessAccountId
      }
    };
  }

  /**
   * Envía un mensaje de prueba para verificar la configuración
   */
  async sendTestMessage(service: 'email' | 'sms' | 'whatsapp', recipient: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const testMessage = {
      subject: '🧪 Mensaje de Prueba - Workshop Pro',
      body: `Este es un mensaje de prueba del sistema de notificaciones de Workshop Pro.
      
📅 Fecha: ${new Date().toLocaleString('es-MX')}
🔧 Servicio: ${service.toUpperCase()}
✅ Si recibes este mensaje, la configuración es correcta.

¡Gracias por usar Workshop Pro!`
    };

    switch (service) {
      case 'email':
        return this.sendEmail({
          to: recipient,
          subject: testMessage.subject,
          text: testMessage.body,
          html: `<pre>${testMessage.body}</pre>`
        });

      case 'sms':
        return this.sendSMS({
          to: recipient,
          body: testMessage.body.substring(0, 160) + '...' // Limitar SMS
        });

      case 'whatsapp':
        return this.sendWhatsApp({
          to: recipient,
          message: testMessage.body,
          type: 'text'
        });

      default:
        return {
          success: false,
          error: 'Servicio no válido'
        };
    }
  }
}

// Exportar instancia singleton
export const externalNotificationService = new ExternalNotificationService();
export default externalNotificationService;