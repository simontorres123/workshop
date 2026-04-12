-- 1. Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 2. Función helper para obtener el rol y organización del usuario actual
-- Esto optimiza las políticas para no repetir subconsultas
CREATE OR REPLACE FUNCTION get_my_org()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 3. Políticas para ORGANIZATIONS
CREATE POLICY "Super admins can manage all organizations" ON organizations
  FOR ALL TO authenticated USING (get_my_role() = 'super_admin');

CREATE POLICY "Org admins can view their own organization" ON organizations
  FOR SELECT TO authenticated USING (id = get_my_org());

-- 4. Políticas para BRANCHES
CREATE POLICY "Users can view branches of their organization" ON branches
  FOR SELECT TO authenticated USING (organization_id = get_my_org());

CREATE POLICY "Org admins can manage branches" ON branches
  FOR ALL TO authenticated USING (organization_id = get_my_org() AND get_my_role() = 'org_admin');

-- 5. Políticas para CLIENTS (Aislamiento Total)
CREATE POLICY "Users can only see clients from their organization" ON clients
  FOR ALL TO authenticated USING (organization_id = get_my_org());

-- 6. Políticas para REPAIR ORDERS
CREATE POLICY "Users can manage repairs from their organization" ON repair_orders
  FOR ALL TO authenticated USING (organization_id = get_my_org());

-- 7. Políticas para INVENTORY
CREATE POLICY "Users can manage inventory from their organization" ON inventory
  FOR ALL TO authenticated USING (organization_id = get_my_org());

-- 8. Políticas para SALES
CREATE POLICY "Users can manage sales from their organization" ON sales
  FOR ALL TO authenticated USING (organization_id = get_my_org());

-- 9. Políticas para USER PROFILES
CREATE POLICY "Users can view profiles in their organization" ON user_profiles
  FOR SELECT TO authenticated USING (organization_id = get_my_org() OR role = 'super_admin');

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- 10. Permisos para Super Admin (Acceso Global)
-- Nota: En Postgres, las políticas se combinan con OR si son del mismo tipo, 
-- pero para mayor claridad podemos añadir el rol a cada una o usar una política global.
DO $$
BEGIN
    -- Política global para Super Admin en todas las tablas (opcional si ya se incluyó arriba)
    -- Por simplicidad, el RLS de Supabase requiere políticas explícitas por tabla.
END $$;
