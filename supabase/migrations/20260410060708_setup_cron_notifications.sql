-- 1. Activar extensiones necesarias (pg_cron para programación y pg_net para llamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función que identifica y procesa las notificaciones pendientes
CREATE OR REPLACE FUNCTION process_due_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- Buscar notificaciones pendientes cuya fecha programada ya pasó
  FOR r IN 
    SELECT * FROM scheduled_notifications 
    WHERE status = 'pending' AND scheduled_for <= NOW()
    LIMIT 100 -- Procesar en bloques para no saturar
  LOOP
    -- Llamar a la Edge Function de forma asíncrona usando pg_net
    -- Nota: Debes reemplazar 'TU_PROYECTO_ID' por el ID real de tu proyecto de Supabase
    PERFORM net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-notification',
      body := json_build_object('record', row_to_json(r))::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
    
    -- Marcar como 'processing' temporalmente para evitar duplicados en el siguiente ciclo
    UPDATE scheduled_notifications SET status = 'sent', sent_at = NOW() WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Programar el Job para que corra cada minuto
-- Esto buscará en la tabla scheduled_notifications cada 60 segundos
SELECT cron.schedule(
  'process-scheduled-notifications-job', -- Nombre del job
  '* * * * *', -- Cada minuto (formato cron)
  'SELECT process_due_notifications();'
);
