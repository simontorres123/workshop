-- Migración: Soporte Múltiples Sucursales para Técnicos

-- 1. Crear tabla intermedia
CREATE TABLE IF NOT EXISTS user_branches (
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, branch_id)
);

-- 2. Migrar datos existentes (transferir branch_id actual a la nueva tabla)
INSERT INTO user_branches (user_id, branch_id)
SELECT id, branch_id 
FROM user_profiles 
WHERE branch_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Crear función auxiliar para RLS
CREATE OR REPLACE FUNCTION get_my_branches()
RETURNS UUID[] AS $$
  SELECT array_agg(branch_id) 
  FROM user_branches 
  WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Actualizar Políticas RLS existentes para soportar múltiples sucursales
-- Reparaciones
DROP POLICY IF EXISTS "RLS_Repairs_Branch_Isolation" ON repair_orders;
CREATE POLICY "RLS_Repairs_Branch_Isolation" ON repair_orders
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  );

-- Inventario
DROP POLICY IF EXISTS "RLS_Inventory_Branch_Isolation" ON inventory;
CREATE POLICY "RLS_Inventory_Branch_Isolation" ON inventory
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  );

-- Ventas
DROP POLICY IF EXISTS "RLS_Sales_Branch_Isolation" ON sales;
CREATE POLICY "RLS_Sales_Branch_Isolation" ON sales
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[]))
    )
  );

-- 5. Eliminar la columna antigua de user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS branch_id;
