-- Phone matching is organization-scoped. Orders keep client_phone unchanged
-- as the historical snapshot captured at reception.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

UPDATE clients
SET phone_normalized = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '521%'
    AND length(regexp_replace(phone, '[^0-9]', '', 'g')) = 13
    THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') from 4)
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '52%'
    AND length(regexp_replace(phone, '[^0-9]', '', 'g')) = 12
    THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '1%'
    AND length(regexp_replace(phone, '[^0-9]', '', 'g')) = 11
    THEN substring(regexp_replace(phone, '[^0-9]', '', 'g') from 2)
  ELSE regexp_replace(phone, '[^0-9]', '', 'g')
END
WHERE phone_normalized IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_org_phone_normalized
  ON clients (organization_id, phone_normalized);
