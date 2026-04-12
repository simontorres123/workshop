export interface Sale {
  id: string;
  type: 'sales';
  folio: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Productos vendidos
  products: SaleProduct[];
  
  // Totales
  subtotal: number;
  tax: number;
  total: number;
  
  // Pagos
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  advancePayment?: number;
  remainingPayment?: number;
  
  // Fechas
  saleDate: Date;
  deliveryDate?: Date;
  
  // Estado
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  
  // Notas
  notes?: string;
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface SaleProduct {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty?: {
    months: number;
    terms?: string;
  };
}

export interface CreateSaleRequest {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  products: Omit<SaleProduct, 'id' | 'totalPrice'>[];
  paymentMethod: Sale['paymentMethod'];
  advancePayment?: number;
  notes?: string;
}

export interface UpdateSaleRequest {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  products?: Omit<SaleProduct, 'id' | 'totalPrice'>[];
  paymentMethod?: Sale['paymentMethod'];
  paymentStatus?: Sale['paymentStatus'];
  status?: Sale['status'];
  notes?: string;
}

export interface SaleSearchFilters {
  search?: string;
  clientName?: string;
  status?: Sale['status'][];
  paymentStatus?: Sale['paymentStatus'][];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'folio' | 'clientName' | 'total' | 'saleDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}