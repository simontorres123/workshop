ALTER TABLE repair_orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

COMMENT ON COLUMN repair_orders.tracking_url IS 'URL pública de seguimiento usada para generar el comprobante y su código QR';
