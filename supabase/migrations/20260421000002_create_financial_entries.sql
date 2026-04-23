-- Recriação correta de financial_entries com split obrigatório.
-- Regra do PRD: toda transação DEVE ter split_wallet_id configurado (NOT NULL + CHECK).

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Referência à subconta que recebeu/gerou a cobrança
  subaccount_id       uuid REFERENCES public.asaas_subaccounts(id) ON DELETE SET NULL,
  asaas_payment_id    text UNIQUE,
  asaas_invoice_url   text,
  -- Split obrigatório — regra de negócio central do PRD
  split_wallet_id     text NOT NULL,
  split_percentage    numeric(5,2) NOT NULL DEFAULT 0
                      CHECK (split_percentage >= 0 AND split_percentage <= 100),
  type                text NOT NULL CHECK (type IN ('income', 'expense', 'refund')),
  amount              numeric(10,2) NOT NULL CHECK (amount > 0),
  net_amount          numeric(10,2),
  description         text,
  due_date            date,
  paid_at             timestamptz,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'overdue', 'refunded', 'cancelled')),
  -- Rastreio de origem para auditoria
  origin              text CHECK (origin IN ('asaas_webhook', 'manual', 'n8n')),
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_entries"
  ON public.financial_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_manage_entries"
  ON public.financial_entries
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER set_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_financial_entries_user_id
  ON public.financial_entries (user_id);

CREATE INDEX idx_financial_entries_status
  ON public.financial_entries (status);

CREATE INDEX idx_financial_entries_asaas_payment_id
  ON public.financial_entries (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;
