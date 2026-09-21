-- Libro de gastos operativo. Los importes se guardan con IVA incluido para
-- reflejar el flujo real de efectivo del taller.
CREATE TABLE IF NOT EXISTS financial_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('rent', 'payroll', 'utilities', 'inventory_purchase', 'transport', 'tools', 'marketing', 'maintenance', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  supplier_name TEXT,
  reference TEXT,
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK ((is_recurring = FALSE AND recurring_frequency IS NULL) OR (is_recurring = TRUE AND recurring_frequency IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_financial_expenses_scope_date
  ON financial_expenses(organization_id, branch_id, expense_date DESC);

ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_expenses_tenant_isolation ON financial_expenses FOR ALL TO authenticated
  USING (
    organization_id = get_my_org()
    AND (get_my_role() IN ('org_admin', 'super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[])))
  )
  WITH CHECK (
    organization_id = get_my_org()
    AND (get_my_role() IN ('org_admin', 'super_admin') OR branch_id = ANY(COALESCE(get_my_branches(), ARRAY[]::UUID[])))
  );
