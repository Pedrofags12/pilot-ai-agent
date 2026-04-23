-- Tabela de splits por transação (suporta múltiplos splits futuros).
-- Índices de performance em leads e conversations.

CREATE TABLE IF NOT EXISTS public.financial_splits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_entry_id  uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  wallet_id           text NOT NULL,
  percentage          numeric(5,2) NOT NULL
                      CHECK (percentage > 0 AND percentage <= 100),
  fixed_value         numeric(10,2),
  description         text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_splits ENABLE ROW LEVEL SECURITY;

-- Acesso via JOIN com financial_entries — apenas service_role escreve
CREATE POLICY "service_role_manage_splits"
  ON public.financial_splits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Usuário lê splits das próprias entradas
CREATE POLICY "users_view_own_splits"
  ON public.financial_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_entries fe
      WHERE fe.id = financial_entry_id
        AND fe.user_id = auth.uid()
    )
  );

CREATE INDEX idx_financial_splits_entry_id
  ON public.financial_splits (financial_entry_id);

-- Índices de performance identificados no diagnóstico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_phone_user_id
  ON public.leads (phone, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_lead_id_created_at
  ON public.conversations (lead_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_ai_active
  ON public.leads (ai_active)
  WHERE ai_active = true;
