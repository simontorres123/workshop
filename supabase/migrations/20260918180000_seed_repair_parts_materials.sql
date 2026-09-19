-- Catálogo inicial de refacciones y materiales usados habitualmente en el taller.
-- Se crea para cada organización y se replica en todas sus sucursales.

DO $$
DECLARE
  v_org RECORD;
  v_branch RECORD;
  v_category_id UUID;
  v_product RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    INSERT INTO inventory_categories (organization_id, name, slug, description)
    VALUES (
      v_org.id,
      'Refacciones y materiales',
      'parts_materials',
      'Componentes electrónicos y materiales de uso frecuente en reparaciones'
    )
    ON CONFLICT (organization_id, slug)
    DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE, updated_at = NOW()
    RETURNING id INTO v_category_id;

    IF v_category_id IS NULL THEN
      SELECT id INTO v_category_id
      FROM inventory_categories
      WHERE organization_id = v_org.id AND slug = 'parts_materials';
    END IF;

    INSERT INTO inventory_products (
      organization_id, category_id, name, description, sku, unit,
      cost_price, sale_price, min_stock, status, metadata
    ) VALUES
      (v_org.id, v_category_id, 'Resistencia axial 1/4 W surtida', 'Resistencias de carbón para reparación de tarjetas y fuentes.', 'MAT-RES-025W', 'pieza', 0.50, 2.00, 20, 'active', jsonb_build_object('category', 'parts_materials', 'technology', 'electronic_component')),
      (v_org.id, v_category_id, 'Capacitor electrolítico 1000 µF 25 V', 'Capacitor radial para fuentes de alimentación y tarjetas de control.', 'MAT-CAP-1000UF25V', 'pieza', 8.00, 20.00, 10, 'active', jsonb_build_object('category', 'parts_materials', 'technology', 'electronic_component')),
      (v_org.id, v_category_id, 'Diodo rectificador 1N4007', 'Diodo rectificador de propósito general para reparación electrónica.', 'MAT-DIO-1N4007', 'pieza', 0.80, 3.00, 20, 'active', jsonb_build_object('category', 'parts_materials', 'technology', 'electronic_component')),
      (v_org.id, v_category_id, 'Fusible cerámico 5 A 250 V', 'Fusible de protección para equipos y fuentes de alimentación.', 'MAT-FUS-5A250V', 'pieza', 4.00, 12.00, 10, 'active', jsonb_build_object('category', 'parts_materials', 'technology', 'protection')),
      (v_org.id, v_category_id, 'Cable flexible calibre 18 AWG', 'Cable flexible para conexiones internas y reparación de aparatos.', 'MAT-CAB-18AWG', 'metro', 6.00, 15.00, 10, 'active', jsonb_build_object('category', 'parts_materials', 'technology', 'cable'))
    ON CONFLICT (organization_id, sku)
    DO UPDATE SET
      category_id = EXCLUDED.category_id,
      description = EXCLUDED.description,
      unit = EXCLUDED.unit,
      cost_price = EXCLUDED.cost_price,
      sale_price = EXCLUDED.sale_price,
      min_stock = EXCLUDED.min_stock,
      status = 'active',
      metadata = inventory_products.metadata || EXCLUDED.metadata,
      updated_at = NOW();

    FOR v_branch IN SELECT id FROM branches WHERE organization_id = v_org.id LOOP
      FOR v_product IN
        SELECT id, sku, min_stock
        FROM inventory_products
        WHERE organization_id = v_org.id AND category_id = v_category_id
          AND sku IN ('MAT-RES-025W', 'MAT-CAP-1000UF25V', 'MAT-DIO-1N4007', 'MAT-FUS-5A250V', 'MAT-CAB-18AWG')
      LOOP
        INSERT INTO inventory_stock (
          organization_id, product_id, branch_id, quantity, min_stock
        ) VALUES (
          v_org.id,
          v_product.id,
          v_branch.id,
          CASE v_product.sku
            WHEN 'MAT-RES-025W' THEN 100
            WHEN 'MAT-CAP-1000UF25V' THEN 25
            WHEN 'MAT-DIO-1N4007' THEN 100
            WHEN 'MAT-FUS-5A250V' THEN 30
            WHEN 'MAT-CAB-18AWG' THEN 50
          END,
          v_product.min_stock
        )
        ON CONFLICT (product_id, branch_id, location_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
