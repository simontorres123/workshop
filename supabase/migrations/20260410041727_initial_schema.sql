-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Referencia a auth.users (Supabase gestiona esto)
);

-- 3. Inventario / Productos
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  max_stock INT,
  location TEXT,
  cost_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  wholesale_price DECIMAL(12,2),
  status TEXT CHECK (status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
  condition TEXT CHECK (condition IN ('new', 'used', 'refurbished', 'damaged')) DEFAULT 'new',
  supplier_id UUID,
  supplier_name TEXT,
  supplier_contact TEXT,
  warranty_months INT,
  service_type TEXT CHECK (service_type IN ('repair', 'sale', 'both')) DEFAULT 'both',
  last_restock_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  images TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 4. Órdenes de Reparación
CREATE TABLE IF NOT EXISTS repair_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE NOT NULL, 
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  
  device_type TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT,
  device_serial TEXT,
  device_description TEXT,
  
  problem_description TEXT,
  initial_diagnosis TEXT,
  confirmed_diagnosis TEXT,
  required_parts TEXT[] DEFAULT '{}',
  
  labor_cost DECIMAL(12,2) DEFAULT 0,
  parts_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  
  advance_payment DECIMAL(12,2) DEFAULT 0,
  total_payment DECIMAL(12,2) DEFAULT 0,
  remaining_payment DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending', 'advance_paid', 'paid')) DEFAULT 'pending',
  
  status TEXT NOT NULL DEFAULT 'pending_diagnosis',
  estimated_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  warranty_period_months INT DEFAULT 3,
  storage_period_months INT DEFAULT 1,
  
  images TEXT[] DEFAULT '{}',
  notes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 5. Historial de Estados (Auditoría)
CREATE TABLE IF NOT EXISTS repair_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 6. Reclamos de Garantía
CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  technician TEXT,
  notes TEXT,
  resolution TEXT,
  status TEXT CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 7. Firmas Digitales
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('repair_order', 'warranty_claim')),
  parent_id UUID NOT NULL, 
  signature_data_url TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT CHECK (signer_role IN ('client', 'technician', 'supervisor')),
  ip_address TEXT,
  device_info TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Ventas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')) NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 9. Detalle de Ítems Vendidos
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL
);

-- Triggers para 'updated_at' automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_inventory_updated_at') THEN
        CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_repair_orders_updated_at') THEN
        CREATE TRIGGER update_repair_orders_updated_at BEFORE UPDATE ON repair_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_updated_at') THEN
        CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_repair_orders_folio ON repair_orders(folio);
CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
