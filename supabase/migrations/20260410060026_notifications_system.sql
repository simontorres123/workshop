-- 1. Tabla de Notificaciones Programadas
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Referencia opcional al técnico
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  repair_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'status_update', 'warranty_expiry', 'storage_alert', 'reminder'
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
  
  -- Contenido de la notificación
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  
  -- Programación
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trigger para actualizar 'updated_at'
CREATE TRIGGER update_notifications_updated_at 
BEFORE UPDATE ON scheduled_notifications 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Índices para performance (importante para el cron)
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON scheduled_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON scheduled_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_repair_id ON scheduled_notifications(repair_id);

-- 4. Función de ayuda para programar notificaciones (RPC)
CREATE OR REPLACE FUNCTION schedule_notification(
  p_client_id UUID,
  p_repair_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO scheduled_notifications (client_id, repair_id, type, title, body, scheduled_for, payload)
  VALUES (p_client_id, p_repair_id, p_type, p_title, p_body, p_scheduled_for, p_payload)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
