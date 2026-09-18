-- Habilitar extensión pg_cron (puede que ya esté habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear la función de procesamiento
CREATE OR REPLACE FUNCTION process_auto_notification_rules()
RETURNS void AS $$
DECLARE
  r RECORD;
  v_title TEXT;
  v_body TEXT;
  v_link TEXT;
  v_new_next_run TIMESTAMPTZ;
  v_new_is_active BOOLEAN;
BEGIN
  -- Iterar sobre reglas activas cuyo next_run ya pasó o es ahora
  FOR r IN 
    SELECT * FROM auto_notification_rules 
    WHERE is_active = true AND next_run <= NOW()
  LOOP
    -- Determinar Título
    v_title := CASE r.type
      WHEN 'warranty_expiring' THEN '⚠️ Garantías por Vencer'
      WHEN 'low_stock' THEN '📦 Stock Bajo Detectado'
      WHEN 'pending_repairs' THEN '🔧 Reparaciones Pendientes'
      WHEN 'daily_summary' THEN '📊 Resumen del Día'
      WHEN 'backup_reminder' THEN '💾 Recordatorio: Backup'
      ELSE '🔔 Notificación del Sistema'
    END;

    -- Determinar Cuerpo
    v_body := CASE r.type
      WHEN 'warranty_expiring' THEN 'Tienes 3 productos con garantía que vence en los próximos 7 días'
      WHEN 'low_stock' THEN '5 productos tienen stock por debajo del mínimo'
      WHEN 'pending_repairs' THEN 'Hay 2 reparaciones sin finalizar desde hace más de 3 días'
      WHEN 'daily_summary' THEN 'Ayer: 5 ventas, 2 reparaciones completadas, $1,250 en ingresos'
      WHEN 'backup_reminder' THEN 'Es hora de hacer un respaldo de tus datos importantes'
      ELSE 'Tienes actualizaciones pendientes en Workshop Pro'
    END;

    -- Determinar Link
    v_link := CASE r.type
      WHEN 'warranty_expiring' THEN '/admin/inventory?filter=warranty_expiring'
      WHEN 'low_stock' THEN '/admin/inventory?filter=low_stock'
      WHEN 'pending_repairs' THEN '/admin/repairs?status=pending'
      WHEN 'daily_summary' THEN '/admin/dashboard'
      WHEN 'backup_reminder' THEN '/admin/system'
      ELSE '/admin/dashboard'
    END;

    -- 1. Insertar notificación en in_app_notifications (Esto dispara Realtime)
    INSERT INTO in_app_notifications (user_id, type, title, body, link)
    VALUES (r.user_id, r.type, v_title, v_body, v_link);

    -- 2. Calcular siguiente ejecución
    v_new_next_run := r.next_run;
    v_new_is_active := true;

    IF r.schedule_expr LIKE '%_daily_%' OR r.schedule_expr LIKE 'daily_%' THEN
      v_new_next_run := v_new_next_run + INTERVAL '1 day';
      -- Prevenir que se quede atrasado si la base de datos estuvo apagada
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

    -- 3. Actualizar la regla original
    UPDATE auto_notification_rules 
    SET is_active = v_new_is_active, 
        next_run = v_new_next_run 
    WHERE id = r.id;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Programar el Job para que corra cada minuto
SELECT cron.schedule(
  'process-auto-rules-job', 
  '* * * * *', 
  'SELECT process_auto_notification_rules();'
);
