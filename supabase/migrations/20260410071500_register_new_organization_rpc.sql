-- Función RPC para inicializar un nuevo taller (onboarding) de forma atómica
-- Esta función crea la organización, la sucursal matriz y vincula al usuario como administrador.

CREATE OR REPLACE FUNCTION initialize_new_organization(
  p_user_id UUID,
  p_org_name TEXT,
  p_org_slug TEXT,
  p_full_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
BEGIN
  -- 1. Crear la Organización
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, p_org_slug)
  RETURNING id INTO v_org_id;

  -- 2. Crear la Sucursal Matriz
  INSERT INTO branches (organization_id, name, is_main_branch)
  VALUES (v_org_id, 'Matriz ' || p_org_name, true)
  RETURNING id INTO v_branch_id;

  -- 3. Crear/Actualizar el Perfil del Usuario como Org Admin
  -- Usamos ON CONFLICT porque el perfil podría ya existir si hay triggers en auth.users
  INSERT INTO user_profiles (id, organization_id, branch_id, role, full_name)
  VALUES (p_user_id, v_org_id, v_branch_id, 'org_admin'::user_role, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    branch_id = EXCLUDED.branch_id,
    role = EXCLUDED.role,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
