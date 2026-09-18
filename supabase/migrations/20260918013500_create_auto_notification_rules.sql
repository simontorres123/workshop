-- CREATE TABLE FOR AUTO NOTIFICATION RULES
CREATE TABLE IF NOT EXISTS auto_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    schedule_expr TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE auto_notification_rules ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS
-- 1. Los usuarios autenticados pueden ver sus propias reglas
CREATE POLICY "Users can view their own auto notification rules"
    ON auto_notification_rules
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Los usuarios autenticados pueden insertar sus propias reglas
CREATE POLICY "Users can insert their own auto notification rules"
    ON auto_notification_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Los usuarios autenticados pueden actualizar sus propias reglas
CREATE POLICY "Users can update their own auto notification rules"
    ON auto_notification_rules
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Los usuarios autenticados pueden eliminar sus propias reglas
CREATE POLICY "Users can delete their own auto notification rules"
    ON auto_notification_rules
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. El service_role puede gestionar todas las reglas
CREATE POLICY "Service role can manage all auto notification rules"
    ON auto_notification_rules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
