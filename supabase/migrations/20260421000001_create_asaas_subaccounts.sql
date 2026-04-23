-- Vincula cada consultor (user_id) à sua subconta Asaas.
-- Regra do PRD: access_token jamais exposto em logs ou respostas de API.

CREATE TABLE IF NOT EXISTS public.asaas_subaccounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_account_id text NOT NULL,
  wallet_id        text NOT NULL,
  -- access_token armazenado como texto; nunca retornar em endpoints públicos
  access_token     text NOT NULL,
  name             text,
  email            text,
  cpf_cnpj         text,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asaas_subaccounts_user_id_key UNIQUE (user_id)
);

-- Impede que qualquer query retorne access_token por acidente via RLS view
ALTER TABLE public.asaas_subaccounts ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas a própria subconta (sem acesso ao access_token via client)
CREATE POLICY "users_view_own_subaccount"
  ON public.asaas_subaccounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas service_role pode inserir/atualizar (feito via Edge Function)
CREATE POLICY "service_role_manage_subaccounts"
  ON public.asaas_subaccounts
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update de updated_at
CREATE TRIGGER set_asaas_subaccounts_updated_at
  BEFORE UPDATE ON public.asaas_subaccounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índice para lookup por asaas_account_id (usado em webhooks do Asaas)
CREATE INDEX idx_asaas_subaccounts_asaas_account_id
  ON public.asaas_subaccounts (asaas_account_id);
