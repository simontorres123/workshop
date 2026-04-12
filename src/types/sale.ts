import { Product } from './product';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer'
}

export interface SaleItem {
  product: Product;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number; // Descuento aplicado al item
}

export interface Sale {
  _id: string;
  saleNumber: string; // Número de venta único
  
  // Items vendidos
  items: SaleItem[];
  
  // Totales
  subtotal: number;
  discount: number; // Descuento total aplicado
  tax: number; // Impuestos (si aplica)
  total: number;
  
  // Pago
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  
  // Cliente (opcional para ventas directas)
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  
  // Información adicional
  notes?: string;
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // ID del usuario que registró la venta
}

export interface CreateSaleRequest {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number; // Si no se proporciona, se usa el precio del producto
    discount?: number;
  }>;
  
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discount?: number;
  
  // Cliente opcional
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  
  notes?: string;
}

export interface SaleFilters {
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: PaymentMethod;
  clientId?: string;
  productId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface SaleSummary {
  period: {
    from: Date;
    to: Date;
  };
  totalSales: number;
  totalAmount: number;
  averageTicket: number;
  paymentMethodBreakdown: {
    [PaymentMethod.CASH]: {
      count: number;
      amount: number;
    };
    [PaymentMethod.CARD]: {
      count: number;
      amount: number;
    };
    [PaymentMethod.TRANSFER]: {
      count: number;
      amount: number;
    };
  };
  topProducts: Array<{
    product: Product;
    quantitySold: number;
    totalRevenue: number;
  }>;
}

export const PAYMENT_METHOD_CONFIG = {
  [PaymentMethod.CASH]: {
    label: 'Efectivo',
    icon: 'eva:wallet-outline',
    color: 'success' as const
  },
  [PaymentMethod.CARD]: {
    label: 'Tarjeta',
    icon: 'eva:credit-card-outline',
    color: 'primary' as const
  },
  [PaymentMethod.TRANSFER]: {
    label: 'Transferencia',
    icon: 'eva:swap-outline',
    color: 'info' as const
  }
} as const;