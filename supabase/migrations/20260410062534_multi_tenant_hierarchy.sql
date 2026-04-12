-- 1. Tipos de Usuario (Roles)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'branch_admin', 'technician');
    END IF;
END $$;

-- 2. Organizaciones (Talleres Principales)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Para URLs personalizadas taller-uno.app.com
  logo_url TEXT,
  tax_id TEXT, -- RFC / NIT / CIF
  subscription_plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sucursales
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_main_branch BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Perfiles de Usuario (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  role user_role NOT NULL DEFAULT 'technician',
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Añadir IDs de Organización y Sucursal a las tablas existentes
-- Clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Inventario
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Órdenes de Reparación
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Ventas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 6. Triggers para updated_at en las nuevas tablas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_branches_updated_at') THEN
        CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
        CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- 7. Índices para búsqueda rápida por organización (Multi-tenancy performance)
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org_branch ON inventory(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_org_branch ON repair_orders(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_branch ON sales(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
