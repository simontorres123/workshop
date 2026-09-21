-- Refuerzo multi-tenant para las operaciones que usan SECURITY DEFINER.
-- Estas funciones son invocadas únicamente por las API server-side, después
-- de validar la sesión y el tenant. No deben quedar expuestas al navegador.

REVOKE EXECUTE ON FUNCTION create_workshop_sale(
  UUID, UUID, UUID, TEXT, TEXT, UUID, NUMERIC, NUMERIC, TEXT, NUMERIC, JSONB, TEXT, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_workshop_sale(
  UUID, UUID, UUID, TEXT, TEXT, UUID, NUMERIC, NUMERIC, TEXT, NUMERIC, JSONB, TEXT, UUID
) TO service_role;

REVOKE EXECUTE ON FUNCTION cancel_workshop_sale(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_workshop_sale(UUID, UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION inventory_apply_movement(
  UUID, UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID, NUMERIC, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_apply_movement(
  UUID, UUID, UUID, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID, NUMERIC, JSONB
) TO service_role;
