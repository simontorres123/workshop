-- Asegurar que el tipo de rol existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'branch_admin', 'technician');
    END IF;
END $$;

-- Crear tabla de perfiles forzadamente
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  branch_id UUID,
  role user_role NOT NULL DEFAULT 'technician',
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar permisos
GRANT ALL ON public.user_profiles TO postgres;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- Insertar Super Admin inicial
INSERT INTO public.user_profiles (id, full_name, role)
VALUES ('b3a51068-3bea-4d5f-b591-b264d6173f4d', 'Super Administrador', 'super_admin')
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
