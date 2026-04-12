import { Client } from './client';
import { RepairOrder } from './repair';
import { Sale } from './sales';
import { InventoryItem } from './inventory';

// Tipos de documento soportados
export type DocumentType = 'client' | 'repair_order' | 'sales' | 'inventory';

// Interfaz base para todos los documentos
export interface BaseDocument {
  id: string;
  type: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Unión de todos los tipos de documento
export type Document = Client | RepairOrder | Sale | InventoryItem;

// Tipos helper para crear documentos
export type CreateDocumentData<T extends DocumentType> = 
  T extends 'client' ? Omit<Client, 'id' | 'createdAt' | 'updatedAt'> :
  T extends 'repair_order' ? Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'> :
  T extends 'sales' ? Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> :
  T extends 'inventory' ? Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> :
  never;

// Tipos helper para obtener documentos por tipo
export type DocumentOfType<T extends DocumentType> = 
  T extends 'client' ? Client :
  T extends 'repair_order' ? RepairOrder :
  T extends 'sales' ? Sale :
  T extends 'inventory' ? InventoryItem :
  never;

// Validador de tipo de documento
export function isDocumentOfType<T extends DocumentType>(
  doc: Document, 
  type: T
): doc is DocumentOfType<T> {
  return doc.type === type;
}

// Utilidades para trabajar con documentos
export const DocumentTypes = {
  CLIENT: 'client' as const,
  REPAIR_ORDER: 'repair_order' as const,
  SALES: 'sales' as const,
  INVENTORY: 'inventory' as const
} satisfies Record<string, DocumentType>;

// Configuración de los tipos de documento
export const DocumentTypeConfig = {
  client: {
    name: 'Cliente',
    pluralName: 'Clientes',
    icon: 'eva:person-outline',
    color: 'primary'
  },
  repair_order: {
    name: 'Orden de Reparación',
    pluralName: 'Órdenes de Reparación',
    icon: 'eva:settings-outline',
    color: 'warning'
  },
  sales: {
    name: 'Venta',
    pluralName: 'Ventas',
    icon: 'eva:shopping-cart-outline',
    color: 'success'
  },
  inventory: {
    name: 'Producto',
    pluralName: 'Inventario',
    icon: 'eva:cube-outline',
    color: 'info'
  }
} as const;