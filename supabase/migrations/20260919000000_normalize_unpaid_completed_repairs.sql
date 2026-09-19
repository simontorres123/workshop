-- Completado representa una orden pagada. Las órdenes antiguas sin cobro
-- regresan a Reparado para que puedan cobrarse desde el flujo normal.
UPDATE repair_orders AS repair
SET
  status = 'repaired',
  payment_status = COALESCE(repair.payment_status, 'pending'),
  updated_at = NOW()
WHERE repair.status = 'completed'
  AND NOT EXISTS (
    SELECT 1
    FROM workshop_sales AS sale
    WHERE sale.repair_id = repair.id
      AND sale.status = 'paid'
  );
