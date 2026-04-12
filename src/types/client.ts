export interface Client {
  id: string;
  type: 'client';
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateClientRequest {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface ClientWithHistory extends Client {
  repairHistory: ClientRepairHistory[];
  totalRepairs: number;
  totalSpent: number;
}

export interface ClientRepairHistory {
  id: string;
  folio: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel?: string;
  status: string;
  totalCost: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface ClientSearchFilters {
  search?: string;
  phone?: string;
  email?: string;
  hasEmail?: boolean;
  sortBy?: 'fullName' | 'phone' | 'createdAt' | 'totalRepairs';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}