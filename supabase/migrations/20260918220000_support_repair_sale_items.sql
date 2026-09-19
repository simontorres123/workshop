-- Permite cobrar mano de obra y refacciones ya utilizadas sin volver a descontarlas del inventario.
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
  v_sale_number TEXT := 'VTA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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
    v_unit_price := COALESCE((v_item->>'unitPrice')::NUMERIC, 0);
    IF v_unit_price < 0 THEN RAISE EXCEPTION 'Precio no válido'; END IF;

    IF COALESCE(v_item->>'type', '') IN ('service', 'repair_part') THEN
      v_subtotal := v_subtotal + (v_unit_price * v_qty);
      INSERT INTO workshop_sale_items (sale_id, product_id, product_name, sku, quantity, unit_price, unit_cost, subtotal)
      VALUES (v_sale.id, NULL, COALESCE(NULLIF(v_item->>'productName', ''), 'Servicio de reparación'), NULLIF(v_item->>'sku', ''), v_qty, v_unit_price, COALESCE((v_item->>'unitCost')::NUMERIC, 0), v_unit_price * v_qty);
      CONTINUE;
    END IF;

    SELECT * INTO v_product FROM inventory_products WHERE id = (v_item->>'productId')::UUID AND organization_id = p_organization_id AND status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado o inactivo'; END IF;
    SELECT * INTO v_stock FROM inventory_stock WHERE organization_id = p_organization_id AND product_id = v_product.id AND branch_id = p_branch_id AND location_id IS NULL FOR UPDATE;
    IF NOT FOUND OR v_stock.quantity < v_qty THEN RAISE EXCEPTION 'Existencia insuficiente para: %', v_product.name; END IF;
    v_unit_price := COALESCE((v_item->>'unitPrice')::NUMERIC, v_product.sale_price);
    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    UPDATE inventory_stock SET quantity = quantity - v_qty, updated_at = NOW() WHERE id = v_stock.id;
    INSERT INTO workshop_sale_items (sale_id, product_id, product_name, sku, quantity, unit_price, unit_cost, subtotal)
    VALUES (v_sale.id, v_product.id, v_product.name, v_product.sku, v_qty, v_unit_price, v_product.cost_price, v_unit_price * v_qty);
  END LOOP;

  v_total := GREATEST(v_subtotal - p_discount, 0);
  UPDATE workshop_sales SET subtotal = v_subtotal, total = v_total, change_amount = GREATEST(p_amount_paid - v_total, 0), status = CASE WHEN p_amount_paid >= v_total THEN 'paid' ELSE 'pending' END, updated_at = NOW() WHERE id = v_sale.id RETURNING * INTO v_sale;
  RETURN v_sale;
END;
$$;
