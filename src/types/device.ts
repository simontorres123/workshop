export interface DeviceCatalogEntry {
  id: string;
  deviceType: string;
  brand: string;
  model?: string;
  isActive: boolean;
}

export interface ClientDevice {
  id: string;
  clientId: string;
  deviceType: string;
  brand: string;
  model?: string;
  serial?: string;
  nickname?: string;
  createdAt: Date;
  updatedAt: Date;
}
