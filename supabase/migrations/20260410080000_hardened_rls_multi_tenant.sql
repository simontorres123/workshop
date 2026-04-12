-- REFUERZO DE SEGURIDAD RLS (Aislamiento por Sucursal y Organización)
-- Este archivo sobreescribe y fortalece las políticas iniciales.

-- 1. Funciones de ayuda optimizadas
CREATE OR REPLACE FUNCTION get_my_org()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Limpiar políticas existentes para reinicializar con refuerzo
DROP POLICY IF EXISTS "Users can only see clients from their organization" ON clients;
DROP POLICY IF EXISTS "Users can manage repairs from their organization" ON repair_orders;
DROP POLICY IF EXISTS "Users can manage inventory from their organization" ON inventory;
DROP POLICY IF EXISTS "Users can manage sales from their organization" ON sales;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- 3. POLÍTICAS REFORZADAS

-- CLIENTES: Compartidos en toda la organización para historial centralizado
CREATE POLICY "RLS_Clients_Org_Isolation" ON clients
  FOR ALL TO authenticated
  USING (organization_id = get_my_org())
  WITH CHECK (organization_id = get_my_org());

-- REPARACIONES: Aislamiento por sucursal para técnicos, visión global para Org Admins
CREATE POLICY "RLS_Repairs_Branch_Isolation" ON repair_orders
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  );

-- INVENTARIO: Stock aislado por sucursal
CREATE POLICY "RLS_Inventory_Branch_Isolation" ON inventory
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  );

-- VENTAS: Registros aislados por sucursal
CREATE POLICY "RLS_Sales_Branch_Isolation" ON sales
  FOR ALL TO authenticated
  USING (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  )
  WITH CHECK (
    organization_id = get_my_org() AND (
      get_my_role() IN ('org_admin', 'super_admin') OR 
      branch_id = get_my_branch()
    )
  );

-- PERFILES DE USUARIO: Ver solo compañeros de organización
CREATE POLICY "RLS_Profiles_Org_Isolation" ON user_profiles
  FOR SELECT TO authenticated
  USING (organization_id = get_my_org() OR get_my_role() = 'super_admin');

CREATE POLICY "RLS_Profiles_Self_Update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
