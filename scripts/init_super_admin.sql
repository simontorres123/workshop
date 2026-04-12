-- SUSTITUIR EL UUID POR EL DEL USUARIO CREADO EN EL DASHBOARD
-- Y EL EMAIL POR EL MISMO USADO EN AUTH
DO $$
DECLARE
  v_user_id UUID := 'AQUÍ_PEGA_EL_UUID_DE_AUTH'; -- <--- CAMBIA ESTO
  v_email TEXT := 'tu-email@ejemplo.com';        -- <--- CAMBIA ESTO
BEGIN
  -- Insertar perfil de Super Admin
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (v_user_id, 'Super Administrador', 'super_admin')
  ON CONFLICT (id) DO UPDATE 
  SET role = 'super_admin';

  RAISE NOTICE 'Perfil de Super Admin vinculado exitosamente para %', v_email;
END $$;
