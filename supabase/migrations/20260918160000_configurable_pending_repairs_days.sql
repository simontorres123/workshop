CREATE OR REPLACE FUNCTION process_auto_notification_rules()
RETURNS void AS $$
DECLARE
  r RECORD;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_new_next_run TIMESTAMPTZ;
  v_new_is_active BOOLEAN;
  
  -- Variables para cálculos dinámicos
  v_count INT;
  v_count2 INT;
  v_amount DECIMAL(12,2);
  v_skip_insert BOOLEAN;
BEGIN
  -- Iterar sobre reglas activas cuyo next_run ya pasó o es ahora
  FOR r IN 
    SELECT * FROM auto_notification_rules 
    WHERE is_active = true AND next_run <= NOW()
  LOOP
    v_skip_insert := false;
    v_count := 0;
    v_count2 := 0;
    v_amount := 0;

    -- LÓGICA DINÁMICA DE CÁLCULO
    IF r.type = 'low_stock' THEN
      SELECT count(*) INTO v_count FROM inventory WHERE quantity <= min_stock AND status = 'active';
      IF v_count > 0 THEN
        v_title := '📦 Stock Bajo Detectado';
        v_body := 'Tienes ' || v_count || ' producto(s) con stock por debajo del mínimo.';
        v_link := '/inventory?filter=low_stock';
      ELSE
        v_skip_insert := true;
      END IF;

    ELSIF r.type = 'pending_repairs' THEN
      SELECT count(*) INTO v_count FROM repair_orders 
      WHERE status IN ('pending_diagnosis', 'in_progress', 'waiting_parts') 
      AND updated_at < NOW() - make_interval(days => GREATEST(0, LEAST(3650, COALESCE((r.config->>'pendingDays')::INTEGER, 3))));
      
      IF v_count > 0 THEN
        v_title := '🔧 Reparaciones Pendientes';
        v_body := 'Hay ' || v_count || ' reparación(es) sin actividad durante al menos ' || COALESCE((r.config->>'pendingDays')::INTEGER, 3) || ' días.';
        v_link := '/repairs?status=pending';
      ELSE
        v_skip_insert := true;
      END IF;

    ELSIF r.type = 'warranty_expiring' THEN
      SELECT count(*) INTO v_count 
      FROM repair_orders 
      WHERE status = 'delivered' 
      AND delivered_at IS NOT NULL
      AND (delivered_at + (warranty_period_months || ' months')::interval) BETWEEN NOW() AND NOW() + INTERVAL '7 days';
      
      IF v_count > 0 THEN
        v_title := '⚠️ Garantías por Vencer';
        v_body := 'Tienes ' || v_count || ' equipo(s) cuya garantía expira en menos de 7 días.';
        v_link := '/inventory?filter=warranty_expiring';
      ELSE
        v_skip_insert := true;
      END IF;

    ELSIF r.type = 'daily_summary' THEN
      -- Ventas de hoy
      SELECT count(*), COALESCE(SUM(total), 0) INTO v_count, v_amount 
      FROM sales 
      WHERE DATE(created_at) = DATE(NOW());
      
      -- Reparaciones completadas hoy
      SELECT count(*) INTO v_count2 
      FROM repair_orders 
      WHERE status IN ('repaired', 'delivered') 
      AND DATE(completed_at) = DATE(NOW());
      
      IF v_count > 0 OR v_count2 > 0 THEN
        v_title := '📊 Resumen del Día';
        v_body := 'Hoy: ' || v_count || ' ventas, ' || v_count2 || ' reparaciones terminadas. Ingresos: $' || v_amount;
        v_link := '/dashboard';
      ELSE
        v_skip_insert := true;
      END IF;

    ELSIF r.type = 'backup_reminder' THEN
      v_title := '💾 Recordatorio: Backup';
      v_body := 'Es un buen momento para respaldar la información de Workshop Pro.';
      v_link := '/system';
      
    ELSE
      v_title := '🔔 Notificación del Sistema';
      v_body := 'Tienes actualizaciones pendientes en Workshop Pro.';
      v_link := '/dashboard';
    END IF;

    -- 1. Insertar notificación SOLO si no se debe omitir
    IF v_skip_insert = false THEN
      INSERT INTO in_app_notifications (user_id, type, title, body, link)
      VALUES (r.user_id, r.type, v_title, v_body, v_link);
    END IF;

    -- 2. Calcular siguiente ejecución siempre (independientemente de si se envió notificación o no)
    v_new_next_run := r.next_run;
    v_new_is_active := true;

    IF r.schedule_expr LIKE '%_daily_%' OR r.schedule_expr LIKE 'daily_%' THEN
      v_new_next_run := v_new_next_run + INTERVAL '1 day';
      WHILE v_new_next_run <= NOW() LOOP
        v_new_next_run := v_new_next_run + INTERVAL '1 day';
      END LOOP;

    ELSIF r.schedule_expr LIKE '%_weekly_%' OR r.schedule_expr LIKE 'weekly_%' THEN
      v_new_next_run := v_new_next_run + INTERVAL '7 days';
      WHILE v_new_next_run <= NOW() LOOP
        v_new_next_run := v_new_next_run + INTERVAL '7 days';
      END LOOP;

    ELSIF r.schedule_expr LIKE 'custom_once_%' THEN
      v_new_is_active := false;
      v_new_next_run := null;
    END IF;

    -- 3. Actualizar la regla original para prepararla para el siguiente ciclo
    UPDATE auto_notification_rules 
    SET is_active = v_new_is_active, 
        next_run = v_new_next_run 
    WHERE id = r.id;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

