import { RepairStatus } from './repair';

export enum NotificationType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

export interface NotificationTemplate {
  _id: string;
  name: string;
  type: NotificationType;
  repairStatus?: RepairStatus; // Para qué estado de reparación se usa
  subject?: string; // Solo para emails
  message: string; // Plantilla con variables como {{clientName}}, {{folio}}, etc.
  variables: string[]; // Lista de variables disponibles
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  type: NotificationType;
  
  // Destinatario
  recipientName: string;
  recipientPhone?: string; // Para WhatsApp/SMS
  recipientEmail?: string; // Para email
  
  // Contenido
  subject?: string; // Solo para emails
  message: string; // Mensaje final (con variables reemplazadas)
  templateId?: string; // Referencia a la plantilla usada
  
  // Contexto
  repairOrderId?: string; // Si está relacionado con una orden de reparación
  repairStatus?: RepairStatus;
  
  // Estado
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface SendNotificationRequest {
  type: NotificationType;
  templateId?: string; // Si se usa una plantilla
  
  // Destinatario
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  
  // Contenido (si no se usa plantilla)
  subject?: string;
  message?: string;
  
  // Variables para reemplazar en la plantilla
  variables?: Record<string, string>;
  
  // Contexto
  repairOrderId?: string;
  repairStatus?: RepairStatus;
}

// Plantillas predeterminadas para cada estado de reparación
export const DEFAULT_WHATSAPP_TEMPLATES = {
  [RepairStatus.PENDING_DIAGNOSIS]: {
    name: 'Aparato Recibido - WhatsApp',
    message: `Hola {{clientName}}! 👋

Su {{deviceType}} {{deviceBrand}} ha sido recibido en nuestro taller.
📋 Folio: {{folio}}
🔍 Estado: En espera de diagnóstico

Puede consultar el estado de su reparación en cualquier momento ingresando a: {{trackingUrl}}

¡Le notificaremos cuando tengamos el diagnóstico listo!

Taller de Electrodomésticos`,
    variables: ['clientName', 'deviceType', 'deviceBrand', 'folio', 'trackingUrl']
  },
  
  [RepairStatus.DIAGNOSIS_CONFIRMED]: {
    name: 'Diagnóstico Confirmado - WhatsApp',
    message: 'Hola {{clientName}}! \n\nYa tenemos el diagnóstico de su {{deviceType}} {{deviceBrand}}:\n📋 Folio: {{folio}}\n🔧 Diagnóstico: {{diagnosis}}\n💰 Costo estimado: ${{totalCost}}\n\n¿Desea autorizar la reparación? Por favor confirme para proceder.\n\nPuede ver más detalles en: {{trackingUrl}}\n\nTaller de Electrodomésticos',
    variables: ['clientName', 'deviceType', 'deviceBrand', 'folio', 'diagnosis', 'totalCost', 'trackingUrl']
  },
  
  [RepairStatus.IN_REPAIR]: {
    name: 'En Reparación - WhatsApp',
    message: `Hola {{clientName}}! 🔧

Su {{deviceType}} {{deviceBrand}} ya está siendo reparado por nuestros técnicos.
📋 Folio: {{folio}}
⏱️ Tiempo estimado: {{estimatedDate}}

Le notificaremos cuando esté listo.

Estado actual: {{trackingUrl}}

Taller de Electrodomésticos`,
    variables: ['clientName', 'deviceType', 'deviceBrand', 'folio', 'estimatedDate', 'trackingUrl']
  },
  
  [RepairStatus.REPAIRED]: {
    name: 'Reparación Completada - WhatsApp',
    message: `¡Excelentes noticias {{clientName}}! ✅

Su {{deviceType}} {{deviceBrand}} ha sido reparado exitosamente.
📋 Folio: {{folio}}
✨ Estado: Listo para recoger

Horario de atención: Lun-Vie 9:00-18:00, Sáb 9:00-14:00

Detalles: {{trackingUrl}}

¡Gracias por confiar en nosotros!

Taller de Electrodomésticos`,
    variables: ['clientName', 'deviceType', 'deviceBrand', 'folio', 'trackingUrl']
  }
};

export const DEFAULT_EMAIL_TEMPLATES = {
  [RepairStatus.PENDING_DIAGNOSIS]: {
    name: 'Aparato Recibido - Email',
    subject: 'Su aparato ha sido recibido - Folio {{folio}}',
    message: `Estimado/a {{clientName}},

Hemos recibido su {{deviceType}} {{deviceBrand}} en nuestro taller para diagnóstico y reparación.

Detalles de su orden:
• Folio: {{folio}}
• Aparato: {{deviceType}} {{deviceBrand}} {{deviceModel}}
• Estado actual: En espera de diagnóstico
• Fecha de ingreso: {{createdDate}}

Puede consultar el estado de su reparación en cualquier momento ingresando al siguiente enlace:
{{trackingUrl}}

Le notificaremos por este medio cuando tengamos el diagnóstico completo.

Atentamente,
Equipo Técnico
Taller de Electrodomésticos`,
    variables: ['clientName', 'deviceType', 'deviceBrand', 'deviceModel', 'folio', 'createdDate', 'trackingUrl']
  }
};

// Configuración de acciones rápidas para el cliente
export interface ClientAction {
  type: 'contact_whatsapp' | 'contact_email' | 'schedule_pickup' | 'rate_service';
  label: string;
  icon: string;
  url?: string; // URL de acción (para WhatsApp, email, etc.)
  message?: string; // Mensaje predeterminado
}

export const CLIENT_ACTIONS_CONFIG: Record<string, ClientAction> = {
  contact_whatsapp: {
    type: 'contact_whatsapp',
    label: 'Contactar por WhatsApp',
    icon: 'eva:message-circle-outline',
    message: 'Hola! Me gustaría consultar sobre mi reparación con folio {{folio}}'
  },
  contact_email: {
    type: 'contact_email',
    label: 'Enviar Email',
    icon: 'eva:email-outline',
    message: 'Consulta sobre reparación - Folio {{folio}}'
  },
  schedule_pickup: {
    type: 'schedule_pickup',
    label: 'Programar Recolección',
    icon: 'eva:calendar-outline'
  },
  rate_service: {
    type: 'rate_service',
    label: 'Calificar Servicio',
    icon: 'eva:star-outline'
  }
};