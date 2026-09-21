-- Asignación explícita de órdenes a técnicos dentro de la misma organización.
ALTER TABLE public.repair_orders
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repair_orders_assigned_technician
  ON public.repair_orders (organization_id, assigned_technician_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.repair_assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  repair_id UUID NOT NULL REFERENCES public.repair_orders(id) ON DELETE CASCADE,
  previous_technician_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_technician_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repair_assignment_history_repair
  ON public.repair_assignment_history (repair_id, created_at DESC);

ALTER TABLE public.repair_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RLS_Repair_Assignment_History_Org_Isolation" ON public.repair_assignment_history;
CREATE POLICY "RLS_Repair_Assignment_History_Org_Isolation"
  ON public.repair_assignment_history
  FOR SELECT TO authenticated
  USING (organization_id = get_my_org());
