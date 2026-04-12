export interface InventoryItem {
  id: string;
  type: 'inventory';
  
  // Información del producto
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  
  // Inventario
  quantity: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  
  // Precios
  costPrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  
  // Estado
  status: 'active' | 'inactive' | 'discontinued';
  condition: 'new' | 'used' | 'refurbished' | 'damaged';
  
  // Proveedor
  supplierId?: string;
  supplierName?: string;
  supplierContact?: string;
  
  // Garantía y servicio
  warrantyMonths?: number;
  serviceType?: 'repair' | 'sale' | 'both';
  
  // Fechas importantes
  lastRestockDate?: Date;
  expiryDate?: Date;
  
  // Imágenes y documentos
  images?: string[];
  documents?: string[];
  
  // Notas
  notes?: string;
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string; // Folio de venta, orden de compra, etc.
  cost?: number;
  
  // Metadatos
  createdAt: Date;
  createdBy?: string;
}

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  costPrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  condition?: InventoryItem['condition'];
  supplierId?: string;
  supplierName?: string;
  supplierContact?: string;
  warrantyMonths?: number;
  serviceType?: InventoryItem['serviceType'];
  notes?: string;
}

export interface UpdateInventoryItemRequest {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  minStock?: number;
  maxStock?: number;
  location?: string;
  costPrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  status?: InventoryItem['status'];
  condition?: InventoryItem['condition'];
  supplierId?: string;
  supplierName?: string;
  supplierContact?: string;
  warrantyMonths?: number;
  serviceType?: InventoryItem['serviceType'];
  notes?: string;
}

export interface InventorySearchFilters {
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  status?: InventoryItem['status'][];
  condition?: InventoryItem['condition'][];
  lowStock?: boolean;
  outOfStock?: boolean;
  supplierId?: string;
  serviceType?: InventoryItem['serviceType'];
  sortBy?: 'name' | 'category' | 'quantity' | 'salePrice' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StockAdjustmentRequest {
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  cost?: number;
}