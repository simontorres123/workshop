-- Logos públicos de los talleres para encabezados, comprobantes y seguimiento.
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view organization assets" ON storage.objects;
CREATE POLICY "Public can view organization assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');
