-- Conserva la fecha de actualización como aproximación para órdenes históricas
-- que ya habían avanzado de estado antes de registrar las fechas del ciclo de vida.
UPDATE repair_orders
SET completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'repaired'
  AND completed_at IS NULL;

UPDATE repair_orders
SET completed_at = COALESCE(completed_at, updated_at),
    delivered_at = COALESCE(delivered_at, updated_at)
WHERE status IN ('delivered', 'completed')
  AND delivered_at IS NULL;
