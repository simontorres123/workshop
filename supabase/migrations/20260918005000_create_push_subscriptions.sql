-- CREATE TABLE FOR PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS
-- 1. Los usuarios autenticados pueden ver sus propias suscripciones
CREATE POLICY "Users can view their own push subscriptions"
    ON push_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Los usuarios autenticados pueden crear sus propias suscripciones
CREATE POLICY "Users can insert their own push subscriptions"
    ON push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Los usuarios pueden borrar sus propias suscripciones (para desuscribirse)
CREATE POLICY "Users can delete their own push subscriptions"
    ON push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 4. El service_role puede leer todas las suscripciones para enviar notificaciones
CREATE POLICY "Service role can read all push subscriptions"
    ON push_subscriptions
    FOR SELECT
    TO service_role
    USING (true);
