-- Refacciones propuestas y reservadas en órdenes usando el inventario normalizado.
CREATE TABLE IF NOT EXISTS repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  repair_id UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','reserved','used','released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reserved_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_repair_parts_scope ON repair_parts(organization_id, repair_id, status);
ALTER TABLE repair_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repair_parts_tenant_isolation ON repair_parts;
CREATE POLICY repair_parts_tenant_isolation ON repair_parts FOR ALL TO authenticated
  USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());

CREATE OR REPLACE FUNCTION reserve_repair_part(p_part_id UUID, p_organization_id UUID)
RETURNS repair_parts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_part repair_parts; v_stock inventory_stock;
BEGIN
  SELECT * INTO v_part FROM repair_parts WHERE id = p_part_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refacción no encontrada'; END IF;
  IF v_part.status <> 'proposed' THEN RAISE EXCEPTION 'Solo se pueden reservar refacciones propuestas'; END IF;
  SELECT * INTO v_stock FROM inventory_stock WHERE organization_id = p_organization_id AND product_id = v_part.product_id AND branch_id = v_part.branch_id AND location_id IS NULL FOR UPDATE;
  IF NOT FOUND OR v_stock.quantity < v_part.quantity THEN RAISE EXCEPTION 'Stock insuficiente para reservar la refacción'; END IF;
  UPDATE inventory_stock SET quantity = quantity - v_part.quantity, updated_at = NOW() WHERE id = v_stock.id;
  UPDATE repair_parts SET status = 'reserved', reserved_at = NOW() WHERE id = v_part.id RETURNING * INTO v_part;
  RETURN v_part;
END;
$$;

CREATE OR REPLACE FUNCTION release_repair_part(p_part_id UUID, p_organization_id UUID)
RETURNS repair_parts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_part repair_parts;
BEGIN
  SELECT * INTO v_part FROM repair_parts WHERE id = p_part_id AND organization_id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refacción no encontrada'; END IF;
  IF v_part.status = 'reserved' THEN
    UPDATE inventory_stock SET quantity = quantity + v_part.quantity, updated_at = NOW()
      WHERE organization_id = p_organization_id AND product_id = v_part.product_id AND branch_id = v_part.branch_id AND location_id IS NULL;
  ELSIF v_part.status NOT IN ('proposed') THEN
    RAISE EXCEPTION 'La refacción no puede liberarse en este estado';
  END IF;
  UPDATE repair_parts SET status = 'released' WHERE id = v_part.id RETURNING * INTO v_part;
  RETURN v_part;
END;
$$;

CREATE OR REPLACE FUNCTION use_repair_parts(p_repair_id UUID, p_organization_id UUID)
RETURNS SETOF repair_parts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY UPDATE repair_parts SET status = 'used', used_at = NOW()
    WHERE repair_id = p_repair_id AND organization_id = p_organization_id AND status = 'reserved' RETURNING *;
END;
$$;
