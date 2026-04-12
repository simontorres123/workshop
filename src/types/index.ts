// Exportaciones de tipos principales
export * from './common';
export * from './client';
export * from './notification';
export * from './product';
export * from './repair';
export * from './sale';

// Tipos adicionales para la aplicación
export interface User {
  _id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'technician' | 'employee';
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWhatsApp?: string;
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  notifications: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
  };
  azure: {
    storageAccount: string;
    containerName: string;
  };
  trackingUrl: string; // URL base para seguimiento público
}
