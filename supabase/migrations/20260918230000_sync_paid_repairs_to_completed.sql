-- Las reparaciones con un cobro pagado deben reflejarse como completadas.
UPDATE repair_orders AS repair
SET
  status = 'completed',
  payment_status = 'paid',
  completed_at = COALESCE(repair.completed_at, payment.paid_at),
  updated_at = NOW()
FROM (
  SELECT repair_id, MAX(created_at) AS paid_at
  FROM workshop_sales
  WHERE repair_id IS NOT NULL
    AND status = 'paid'
  GROUP BY repair_id
) AS payment
WHERE repair.id = payment.repair_id
  AND repair.status NOT IN ('completed', 'cancelled', 'repair_rejected');
