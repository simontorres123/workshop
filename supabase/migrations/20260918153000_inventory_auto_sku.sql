-- Genera SKUs únicos por organización cuando el usuario no captura uno.
CREATE OR REPLACE FUNCTION inventory_generate_sku(p_organization_id UUID, p_category TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next INTEGER;
BEGIN
  v_prefix := CASE COALESCE(p_category, 'other')
    WHEN 'spare_parts' THEN 'REF'
    WHEN 'consumables' THEN 'CON'
    WHEN 'electrical' THEN 'ELE'
    WHEN 'cables_connectors' THEN 'CAB'
    WHEN 'fasteners' THEN 'TOR'
    WHEN 'lubricants' THEN 'LUB'
    WHEN 'cleaning' THEN 'LIM'
    WHEN 'tools' THEN 'HER'
    WHEN 'safety' THEN 'SEG'
    WHEN 'packaging' THEN 'EMP'
    ELSE 'OTR'
  END;

  -- Evita duplicados cuando hay creaciones simultáneas en la misma organización.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::TEXT || ':' || v_prefix, 0));

  SELECT COALESCE(MAX((substring(sku FROM length(v_prefix) + 2))::INTEGER), 0) + 1
    INTO v_next
  FROM inventory_products
  WHERE organization_id = p_organization_id
    AND sku ~ ('^' || v_prefix || '-[0-9]+$');

  RETURN v_prefix || '-' || lpad(v_next::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_products_assign_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sku IS NULL OR btrim(NEW.sku) = '' THEN
    NEW.sku := inventory_generate_sku(NEW.organization_id, NEW.metadata->>'category');
  ELSE
    NEW.sku := upper(btrim(NEW.sku));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_products_assign_sku_trigger ON inventory_products;
CREATE TRIGGER inventory_products_assign_sku_trigger
BEFORE INSERT ON inventory_products
FOR EACH ROW EXECUTE FUNCTION inventory_products_assign_sku();
