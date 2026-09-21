-- Compatibilidad para instalaciones donde las migraciones de jerarquía
-- posteriores al RPC inicial todavía no fueron aplicadas.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch_id);

CREATE OR REPLACE FUNCTION initialize_new_organization(
  p_user_id UUID,
  p_org_name TEXT,
  p_org_slug TEXT,
  p_full_name TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
BEGIN
  -- El perfil puede existir por el alta previa en auth.users.
  INSERT INTO user_profiles (id, full_name)
  VALUES (p_user_id, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  INSERT INTO organizations (name, slug, organizer_id)
  VALUES (p_org_name, p_org_slug, p_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO branches (organization_id, name, is_main_branch)
  VALUES (v_org_id, 'Matriz ' || p_org_name, true)
  RETURNING id INTO v_branch_id;

  UPDATE user_profiles
  SET organization_id = v_org_id,
      branch_id = v_branch_id,
      role = 'org_admin'::user_role,
      full_name = COALESCE(p_full_name, full_name),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

