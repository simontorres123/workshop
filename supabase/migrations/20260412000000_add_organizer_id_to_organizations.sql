-- Add organizer_id column to organizations
ALTER TABLE organizations
  ADD COLUMN organizer_id UUID REFERENCES user_profiles(id);

-- Update the RPC to set organizer_id when creating an organization
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
  -- 1. Crear/Actualizar el Perfil del Usuario (debe existir antes por FK de organizer_id)
  INSERT INTO user_profiles (id, full_name)
  VALUES (p_user_id, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  -- 2. Crear la Organizacion con organizer_id
  INSERT INTO organizations (name, slug, organizer_id)
  VALUES (p_org_name, p_org_slug, p_user_id)
  RETURNING id INTO v_org_id;

  -- 3. Crear la Sucursal Matriz
  INSERT INTO branches (organization_id, name, is_main_branch)
  VALUES (v_org_id, 'Matriz ' || p_org_name, true)
  RETURNING id INTO v_branch_id;

  -- 4. Actualizar el Perfil del Usuario con organization_id, branch_id y rol
  UPDATE user_profiles SET
    organization_id = v_org_id,
    branch_id = v_branch_id,
    role = 'org_admin'::user_role
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
