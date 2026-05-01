-- =============================================================
-- Mensagens Agendadas + Client ID em cobranças + Tags em clientes
-- =============================================================

-- 1. TABELA scheduled_messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  group_name   text,
  message      text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_scheduled_messages"
  ON public.scheduled_messages FOR ALL
  USING (auth.uid() = user_id);

CREATE TRIGGER set_scheduled_messages_updated_at
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_scheduled_messages_user_id
  ON public.scheduled_messages (user_id);

CREATE INDEX idx_scheduled_messages_client_id
  ON public.scheduled_messages (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_scheduled_messages_scheduled_at
  ON public.scheduled_messages (scheduled_at);

-- 2. ADICIONA client_id em financial_entries (liga cobrança ao cliente)
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_entries_client_id
  ON public.financial_entries (client_id)
  WHERE client_id IS NOT NULL;

-- 3. ADICIONA tags (grupos) em clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
