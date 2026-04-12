import { ImageMetadata } from './repair'; // Reutilizamos el tipo de imagen

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

export enum ProductCategory {
  WASHING_MACHINE = 'washing_machine',
  REFRIGERATOR = 'refrigerator',
  MICROWAVE = 'microwave',
  DISHWASHER = 'dishwasher',
  OVEN = 'oven',
  AIR_CONDITIONER = 'air_conditioner',
  DRYER = 'dryer',
  FREEZER = 'freezer',
  OTHER = 'other'
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  category: ProductCategory;
  
  // Precios y costos
  price: number; // Precio de venta al público
  cost?: number; // Costo de adquisición (privado)
  
  // Inventario
  stock: number;
  lowStockThreshold: number;
  location?: string; // Ubicación física en el almacén
  
  // Información técnica
  specifications?: Record<string, string>; // Ej: { "Capacidad": "10kg", "Voltaje": "110V" }
  warranty?: {
    duration: number; // En meses
    type: 'manufacturer' | 'store' | 'extended';
    terms?: string;
  };
  
  // SKU y códigos
  sku?: string; // Código interno
  barcode?: string; // Código de barras
  supplierCode?: string; // Código del proveedor
  
  // Estado y visibilidad
  status: ProductStatus;
  isActive: boolean; // Si está disponible para venta
  isFeatured?: boolean; // Si aparece destacado
  
  // Proveedor
  supplier?: {
    name: string;
    contact?: string;
    lastPurchaseDate?: Date;
    lastPurchasePrice?: number;
  };
  
  // Media y documentación
  images: ImageMetadata[];
  manualUrl?: string; // URL del manual del producto
  
  // SEO y búsqueda
  tags?: string[]; // Para búsqueda y filtros
  searchKeywords?: string; // Palabras clave adicionales
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  brand: string;
  model: string;
  category: ProductCategory;
  price: number;
  cost?: number;
  stock: number;
  lowStockThreshold: number;
  location?: string;
  specifications?: Record<string, string>;
  branchId?: string;
  warranty?: {
    duration: number;
    type: 'manufacturer' | 'store' | 'extended';
    terms?: string;
  };
  sku?: string;
  barcode?: string;
  supplierCode?: string;
  supplier?: {
    name: string;
    contact?: string;
  };
  tags?: string[];
  images?: File[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
  addImages?: File[];
  removeImages?: string[]; // IDs de imágenes a eliminar
}

export interface ProductFilters {
  category?: ProductCategory;
  brand?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean; // Solo productos con stock bajo
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string; // Búsqueda por nombre, descripción, tags
  branchId?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string; // 'sale', 'purchase', 'return', 'adjustment', 'damage'
  reference?: string; // ID de venta, compra, etc.
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

export const PRODUCT_CATEGORY_CONFIG = {
  [ProductCategory.WASHING_MACHINE]: {
    label: 'Lavadora',
    icon: 'eva:droplet-outline',
    color: 'info' as const
  },
  [ProductCategory.REFRIGERATOR]: {
    label: 'Refrigerador',
    icon: 'eva:cube-outline',
    color: 'primary' as const
  },
  [ProductCategory.MICROWAVE]: {
    label: 'Microondas',
    icon: 'eva:radio-outline',
    color: 'warning' as const
  },
  [ProductCategory.DISHWASHER]: {
    label: 'Lavavajillas',
    icon: 'eva:checkmark-square-outline',
    color: 'success' as const
  },
  [ProductCategory.OVEN]: {
    label: 'Horno',
    icon: 'eva:thermometer-outline',
    color: 'error' as const
  },
  [ProductCategory.AIR_CONDITIONER]: {
    label: 'Aire Acondicionado',
    icon: 'eva:wind-outline',
    color: 'info' as const
  },
  [ProductCategory.DRYER]: {
    label: 'Secadora',
    icon: 'eva:sun-outline',
    color: 'warning' as const
  },
  [ProductCategory.FREEZER]: {
    label: 'Congelador',
    icon: 'eva:snowflake-outline',
    color: 'primary' as const
  },
  [ProductCategory.OTHER]: {
    label: 'Otro',
    icon: 'eva:more-horizontal-outline',
    color: 'secondary' as const
  }
} as const;
