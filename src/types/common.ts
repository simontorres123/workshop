// Tipos utilitarios comunes
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>; // Para errores de validación
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: string;
  color?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

// Estados de carga
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: string;
}

export interface MutationState extends LoadingState {
  isSuccess: boolean;
}

// Tipos para formularios
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'file';
  value: T;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: SelectOption[]; // Para campos select
  accept?: string; // Para campos file
  multiple?: boolean; // Para campos file y select
}

// Configuración de tabla
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'custom';
  render?: (value: any, row: T) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationParams;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRowClick?: (row: T) => void;
  actions?: Array<{
    label: string;
    icon: string;
    onClick: (row: T) => void;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    disabled?: (row: T) => boolean;
  }>;
}

// Configuración de notificaciones toast
export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Estados de la aplicación
export interface AppState {
  user: any; // Usuario autenticado
  isLoading: boolean;
  theme: 'light' | 'dark';
  notifications: ToastConfig[];
}

// Configuración de filtros
export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: SelectOption[];
  multiple?: boolean;
}

// Hook de datos genérico
export interface UseDataResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refetch: () => Promise<void>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

// Configuración de dashboard
export interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  onClick?: () => void;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

// Tipos para navegación
export interface NavItem {
  title: string;
  path: string;
  icon: string;
  children?: NavItem[];
  disabled?: boolean;
  roles?: string[]; // Roles que pueden ver este item
}

// Configuración de permisos
export interface Permission {
  resource: string; // 'products', 'repairs', 'sales', etc.
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  condition?: (user: any, resource: any) => boolean;
}

// Tipos para auditoría
export interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string; // 'create', 'update', 'delete', 'login', etc.
  resource: string; // 'product', 'repair_order', 'sale', etc.
  resourceId?: string;
  changes?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Configuración de búsqueda
export interface SearchConfig {
  placeholder: string;
  fields: string[]; // Campos en los que buscar
  filters?: FilterConfig[];
  minLength?: number;
  debounceMs?: number;
}

// Tipos para reportes
export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  type: 'table' | 'chart' | 'summary';
  parameters?: FilterConfig[];
  exportFormats?: ('pdf' | 'excel' | 'csv')[];
}

export interface ReportData {
  config: ReportConfig;
  data: any[];
  summary?: Record<string, number | string>;
  generatedAt: Date;
  generatedBy: string;
}