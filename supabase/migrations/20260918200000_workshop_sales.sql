-- Ventas del taller integradas con el inventario normalizado.
CREATE TABLE IF NOT EXISTS workshop_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  sale_number TEXT NOT NULL,
  repair_id UUID REFERENCES repair_orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed')),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'pending', 'paid', 'cancelled', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, sale_number)
);

CREATE TABLE IF NOT EXISTS workshop_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES workshop_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_workshop_sales_scope ON workshop_sales(organization_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_sales_repair ON workshop_sales(repair_id);
CREATE INDEX IF NOT EXISTS idx_workshop_sale_items_sale ON workshop_sale_items(sale_id);

CREATE OR REPLACE FUNCTION create_workshop_sale(
  p_organization_id UUID,
  p_branch_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_phone TEXT DEFAULT NULL,
  p_repair_id UUID DEFAULT NULL,
  p_discount NUMERIC DEFAULT 0,
  p_tax NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'cash',
  p_amount_paid NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS workshop_sales
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sale workshop_sales;
  v_item JSONB;
  v_product inventory_products;
  v_stock inventory_stock;
  v_qty INTEGER;
  v_unit_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC;
  v_sale_number TEXT := 'VTA-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8));
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'La venta debe incluir al menos un producto'; END IF;
  IF p_payment_method NOT IN ('cash', 'card', 'transfer', 'mixed') THEN RAISE EXCEPTION 'Método de pago no válido'; END IF;
  IF p_discount < 0 OR p_tax < 0 THEN RAISE EXCEPTION 'Descuento o impuesto no válido'; END IF;

  INSERT INTO workshop_sales (organization_id, branch_id, sale_number, repair_id, client_id, client_name, client_phone, discount, tax, payment_method, amount_paid, notes, created_by)
  VALUES (p_organization_id, p_branch_id, v_sale_number, p_repair_id, p_client_id, NULLIF(trim(p_client_name), ''), NULLIF(trim(p_client_phone), ''), p_discount, p_tax, p_payment_method, GREATEST(p_amount_paid, 0), p_notes, p_created_by)
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Cantidad no válida'; END IF;

    SELECT * INTO v_product FROM inventory_products
    WHERE id = (v_item->>'productId')::UUID AND organization_id = p_organization_id AND status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado o inactivo'; END IF;

    SELECT * INTO v_stock FROM inventory_stock
    WHERE organization_id = p_organization_id AND product_id = v_product.id AND branch_id = p_branch_id AND location_id IS NULL
    FOR UPDATE;
    IF NOT FOUND OR v_stock.quantity < v_qty THEN
      RAISE EXCEPTION 'Existencia insuficiente para: %', v_product.name;
    END IF;

    v_unit_price := COALESCE((v_item->>'unitPrice')::NUMERIC, v_product.sale_price);
    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    UPDATE inventory_stock SET quantity = quantity - v_qty, updated_at = NOW() WHERE id = v_stock.id;
    INSERT INTO workshop_sale_items (sale_id, product_id, product_name, sku, quantity, unit_price, unit_cost, subtotal)
    VALUES (v_sale.id, v_product.id, v_product.name, v_product.sku, v_qty, v_unit_price, v_product.cost_price, v_unit_price * v_qty);
  END LOOP;

  v_total := GREATEST(v_subtotal - p_discount + p_tax, 0);
  UPDATE workshop_sales SET subtotal = v_subtotal, total = v_total, change_amount = GREATEST(p_amount_paid - v_total, 0), status = CASE WHEN p_amount_paid >= v_total THEN 'paid' ELSE 'pending' END, updated_at = NOW() WHERE id = v_sale.id RETURNING * INTO v_sale;
  RETURN v_sale;
END;
$$;

ALTER TABLE workshop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY workshop_sales_tenant_isolation ON workshop_sales FOR ALL TO authenticated USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());
CREATE POLICY workshop_sale_items_tenant_isolation ON workshop_sale_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM workshop_sales s WHERE s.id = sale_id AND s.organization_id = get_my_org())) WITH CHECK (EXISTS (SELECT 1 FROM workshop_sales s WHERE s.id = sale_id AND s.organization_id = get_my_org()));
