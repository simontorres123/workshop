-- Enlace seguro y único para que el cliente firme su comprobante desde el celular.
ALTER TABLE repair_orders
  ADD COLUMN IF NOT EXISTS client_signature_token UUID DEFAULT uuid_generate_v4();

UPDATE repair_orders
SET client_signature_token = uuid_generate_v4()
WHERE client_signature_token IS NULL;

ALTER TABLE repair_orders
  ALTER COLUMN client_signature_token SET DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_repair_orders_client_signature_token
  ON repair_orders(client_signature_token);

CREATE INDEX IF NOT EXISTS idx_digital_signatures_repair_order
  ON digital_signatures(parent_type, parent_id, signer_role);
