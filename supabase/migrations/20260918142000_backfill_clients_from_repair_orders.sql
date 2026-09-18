-- Reconstruct clients from historical repair orders created before automatic linking.
-- Only orders with an organization are migrated so tenant isolation is preserved.
WITH historical_orders AS (
  SELECT DISTINCT ON (ro.organization_id, normalized_phone)
    ro.organization_id,
    normalized_phone,
    NULLIF(BTRIM(ro.client_name), '') AS full_name,
    NULLIF(BTRIM(ro.client_phone), '') AS phone,
    NULLIF(BTRIM(ro.client_email), '') AS email,
    ro.created_at
  FROM (
    SELECT
      repair_orders.*,
      CASE
        WHEN regexp_replace(client_phone, '[^0-9]', '', 'g') LIKE '521%'
          AND length(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 13
          THEN substring(regexp_replace(client_phone, '[^0-9]', '', 'g') from 4)
        WHEN regexp_replace(client_phone, '[^0-9]', '', 'g') LIKE '52%'
          AND length(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 12
          THEN substring(regexp_replace(client_phone, '[^0-9]', '', 'g') from 3)
        WHEN regexp_replace(client_phone, '[^0-9]', '', 'g') LIKE '1%'
          AND length(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 11
          THEN substring(regexp_replace(client_phone, '[^0-9]', '', 'g') from 2)
        ELSE regexp_replace(client_phone, '[^0-9]', '', 'g')
      END AS normalized_phone
    FROM repair_orders
    WHERE organization_id IS NOT NULL
      AND client_phone IS NOT NULL
      AND regexp_replace(client_phone, '[^0-9]', '', 'g') <> ''
  ) ro
  LEFT JOIN clients c
    ON c.organization_id = ro.organization_id
   AND c.phone_normalized = ro.normalized_phone
  WHERE c.id IS NULL
  ORDER BY ro.organization_id, normalized_phone, ro.created_at ASC NULLS LAST
)
INSERT INTO clients (full_name, phone, phone_normalized, email, organization_id, created_at, updated_at)
SELECT
  COALESCE(full_name, 'Cliente sin nombre'),
  phone,
  normalized_phone,
  email,
  organization_id,
  COALESCE(created_at, NOW()),
  NOW()
FROM historical_orders
WHERE phone IS NOT NULL
ON CONFLICT DO NOTHING;

-- Link every historical order to the reconstructed or previously existing client.
UPDATE repair_orders ro
SET client_id = c.id
FROM clients c
WHERE ro.client_id IS NULL
  AND ro.organization_id IS NOT NULL
  AND c.organization_id = ro.organization_id
  AND c.phone_normalized = CASE
    WHEN regexp_replace(ro.client_phone, '[^0-9]', '', 'g') LIKE '521%'
      AND length(regexp_replace(ro.client_phone, '[^0-9]', '', 'g')) = 13
      THEN substring(regexp_replace(ro.client_phone, '[^0-9]', '', 'g') from 4)
    WHEN regexp_replace(ro.client_phone, '[^0-9]', '', 'g') LIKE '52%'
      AND length(regexp_replace(ro.client_phone, '[^0-9]', '', 'g')) = 12
      THEN substring(regexp_replace(ro.client_phone, '[^0-9]', '', 'g') from 3)
    WHEN regexp_replace(ro.client_phone, '[^0-9]', '', 'g') LIKE '1%'
      AND length(regexp_replace(ro.client_phone, '[^0-9]', '', 'g')) = 11
      THEN substring(regexp_replace(ro.client_phone, '[^0-9]', '', 'g') from 2)
    ELSE regexp_replace(ro.client_phone, '[^0-9]', '', 'g')
  END;
