-- CREATE TABLE FOR IN APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS
-- 1. Los usuarios autenticados pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own in-app notifications"
    ON in_app_notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Los usuarios autenticados pueden actualizar sus propias notificaciones (para marcar como leídas)
CREATE POLICY "Users can update their own in-app notifications"
    ON in_app_notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 3. Los usuarios pueden borrar sus propias notificaciones
CREATE POLICY "Users can delete their own in-app notifications"
    ON in_app_notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. El service_role puede insertar notificaciones para cualquier usuario
CREATE POLICY "Service role can insert in-app notifications"
    ON in_app_notifications
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;
