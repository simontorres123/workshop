-- Inventario normalizado por organización y sucursal.
-- Esta migración es deliberadamente aditiva: conserva inventory para compatibilidad
-- y crea las tablas/funciones necesarias para el nuevo módulo.

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  brand TEXT,
  model TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  max_stock INTEGER CHECK (max_stock IS NULL OR max_stock >= min_stock),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, sku),
  UNIQUE (organization_id, barcode)
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, branch_id, name),
  UNIQUE (organization_id, branch_id, code)
);

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  max_stock INTEGER CHECK (max_stock IS NULL OR max_stock >= min_stock),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, branch_id, location_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'waste', 'transfer')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
  new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
  reason TEXT NOT NULL,
  reference TEXT,
  transfer_branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
  transfer_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  unit_cost NUMERIC(12,2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_products_org ON inventory_products(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_scope ON inventory_stock(organization_id, branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_scope ON inventory_movements(organization_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION inventory_apply_movement(
  p_organization_id UUID,
  p_product_id UUID,
  p_branch_id UUID,
  p_location_id UUID,
  p_type TEXT,
  p_quantity INTEGER,
  p_reason TEXT,
  p_reference TEXT DEFAULT NULL,
  p_transfer_branch_id UUID DEFAULT NULL,
  p_transfer_location_id UUID DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS inventory_movements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stock inventory_stock;
  v_new INTEGER;
  v_delta INTEGER;
  v_movement inventory_movements;
BEGIN
  IF p_organization_id <> get_my_org() THEN RAISE EXCEPTION 'organization scope violation'; END IF;
  IF get_my_role() NOT IN ('org_admin', 'super_admin') AND NOT (p_branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))) THEN
    RAISE EXCEPTION 'branch scope violation';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 0 OR (p_type <> 'adjustment' AND p_quantity = 0) THEN RAISE EXCEPTION 'quantity must be valid'; END IF;
  IF p_type NOT IN ('in', 'out', 'adjustment', 'waste', 'transfer') THEN RAISE EXCEPTION 'invalid movement type'; END IF;

  INSERT INTO inventory_stock (organization_id, product_id, branch_id, location_id, min_stock, max_stock)
  SELECT p_organization_id, p_product_id, p_branch_id, p_location_id, min_stock, max_stock
  FROM inventory_products WHERE id = p_product_id AND organization_id = p_organization_id
  ON CONFLICT (product_id, branch_id, location_id) DO NOTHING;

  SELECT * INTO v_stock FROM inventory_stock
  WHERE organization_id = p_organization_id AND product_id = p_product_id
    AND branch_id = p_branch_id AND inventory_stock.location_id IS NOT DISTINCT FROM p_location_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'stock record not found'; END IF;

  v_delta := CASE WHEN p_type = 'in' THEN p_quantity WHEN p_type IN ('out', 'waste', 'transfer') THEN -p_quantity ELSE p_quantity - v_stock.quantity END;
  v_new := v_stock.quantity + v_delta;
  IF v_new < 0 THEN RAISE EXCEPTION 'insufficient stock'; END IF;

  UPDATE inventory_stock SET quantity = v_new, updated_at = NOW() WHERE id = v_stock.id;
  INSERT INTO inventory_movements (organization_id, product_id, branch_id, location_id, type, quantity, previous_quantity, new_quantity, reason, reference, transfer_branch_id, transfer_location_id, unit_cost, metadata, created_by)
  VALUES (p_organization_id, p_product_id, p_branch_id, p_location_id, p_type, GREATEST(ABS(v_delta), 1), v_stock.quantity, v_new, p_reason, p_reference, p_transfer_branch_id, p_transfer_location_id, p_unit_cost, COALESCE(p_metadata, '{}'::jsonb), auth.uid())
  RETURNING * INTO v_movement;
  RETURN v_movement;
END;
$$;

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_categories_tenant_isolation ON inventory_categories FOR ALL TO authenticated
  USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());
CREATE POLICY inventory_products_tenant_isolation ON inventory_products FOR ALL TO authenticated
  USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());
CREATE POLICY inventory_locations_tenant_isolation ON inventory_locations FOR ALL TO authenticated
  USING (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))))
  WITH CHECK (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))));
CREATE POLICY inventory_stock_tenant_isolation ON inventory_stock FOR ALL TO authenticated
  USING (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))))
  WITH CHECK (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))));
CREATE POLICY inventory_movements_tenant_isolation ON inventory_movements FOR ALL TO authenticated
  USING (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))))
  WITH CHECK (organization_id = get_my_org() AND (get_my_role() IN ('org_admin','super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))));

