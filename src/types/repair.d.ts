import { ImageMetadata } from './product';

interface Client {
  name: string;
  phone: string;
  email?: string;
}

type RepairStatus =
  | 'PENDING_DIAGNOSIS'
  | 'DIAGNOSIS_COMPLETE'
  | 'REPAIR_ACCEPTED'
  | 'REPAIR_REJECTED'
  | 'IN_REPAIR'
  | 'REPAIRED_PENDING_PICKUP'
  | 'DELIVERED';

interface RepairUpdate {
  status: RepairStatus;
  notes: string;
  updatedBy: string; // ID del admin
  createdAt: Date;
}

interface RepairOrder {
  _id: string;
  folio: string; // Folio único y legible
  client: Client;
  appliance: {
    type: string; // Ej: Lavadora, Refrigerador
    brand: string;
    model?: string;
    serialNumber?: string;
    initialDescription: string;
  };
  initialImage: ImageMetadata;
  status: RepairStatus;
  notesForClient: string;
  internalNotes?: string;
  history: RepairUpdate[];
  estimatedDeliveryDate?: Date;
  upfrontPayment?: number; // Anticipo
  finalCost?: number;
  createdAt: Date;
  updatedAt: Date;
}
