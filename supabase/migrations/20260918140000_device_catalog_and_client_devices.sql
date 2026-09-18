CREATE TABLE IF NOT EXISTS device_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_catalog_key ON device_catalog (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(device_type), lower(brand), lower(COALESCE(model, '')));

CREATE TABLE IF NOT EXISTS client_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  serial TEXT,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_device_key ON client_devices (organization_id, client_id, lower(device_type), lower(brand), lower(COALESCE(model, '')), lower(COALESCE(serial, '')));
CREATE INDEX IF NOT EXISTS idx_client_devices_client ON client_devices (organization_id, client_id);

ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS client_device_id UUID REFERENCES client_devices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_repair_orders_client_device ON repair_orders(client_device_id);
DROP TRIGGER IF EXISTS update_client_devices_updated_at ON client_devices;
CREATE TRIGGER update_client_devices_updated_at BEFORE UPDATE ON client_devices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE device_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view global and organization device catalog" ON device_catalog FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = get_my_org());
CREATE POLICY "Users can manage organization device catalog" ON device_catalog FOR ALL TO authenticated USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());
CREATE POLICY "Users can manage client devices from their organization" ON client_devices FOR ALL TO authenticated USING (organization_id = get_my_org()) WITH CHECK (organization_id = get_my_org());

INSERT INTO device_catalog (device_type, brand) VALUES
  ('Lavadora', 'LG'), ('Lavadora', 'Samsung'), ('Lavadora', 'Whirlpool'), ('Lavadora', 'Mabe'),
  ('Refrigerador', 'LG'), ('Refrigerador', 'Samsung'), ('Refrigerador', 'Whirlpool'), ('Refrigerador', 'Mabe'),
  ('Microondas', 'LG'), ('Microondas', 'Samsung'), ('Microondas', 'Panasonic'), ('Licuadora', 'Oster'),
  ('Licuadora', 'Hamilton Beach'), ('Aspiradora', 'Electrolux'), ('Cafetera', 'Oster'),
  ('Plancha', 'Black+Decker'), ('Ventilador', 'Philips') ON CONFLICT DO NOTHING;
