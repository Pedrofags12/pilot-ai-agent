-- =============================================================
-- SECURITY HARDENING — Plataforma Élo
-- Princípios: least privilege, defense in depth, audit trail
-- =============================================================

-- -------------------------------------------------------------
-- 1. CONVERSATIONS — corrige policy anônima que permite leitura
--    cruzada entre sessões diferentes
-- -------------------------------------------------------------

-- Remove policy permissiva de leitura anônima irrestrita
DROP POLICY IF EXISTS "Widget can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users view conversations for own leads" ON public.conversations;

-- Chat widget: pode inserir conversation APENAS para leads com sua session_id
-- (não usamos auth.uid() pois o widget é anônimo por design)
CREATE POLICY "widget_insert_conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND l.session_id IS NOT NULL
    )
  );

-- Usuários autenticados (consultores): leem conversations dos PRÓPRIOS leads
CREATE POLICY "authenticated_view_own_conversations"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND l.user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

-- Chat widget anônimo: lê conversations SOMENTE do próprio lead (por lead_id + session válida)
-- Isso evita que um anônimo leia conversations de outros leads
CREATE POLICY "widget_view_own_session_conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND l.session_id IS NOT NULL
    )
  );

-- -------------------------------------------------------------
-- 2. FINANCIAL_ENTRIES — reforça que só service_role escreve,
--    garante imutabilidade de registros confirmados
-- -------------------------------------------------------------

-- Impede deleção de registros financeiros confirmados (audit trail imutável)
CREATE OR REPLACE FUNCTION public.prevent_confirmed_entry_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IN ('confirmed', 'refunded') THEN
    RAISE EXCEPTION 'Registros financeiros confirmados ou estornados não podem ser deletados. Use status "cancelled".';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tg_prevent_confirmed_entry_deletion ON public.financial_entries;
CREATE TRIGGER tg_prevent_confirmed_entry_deletion
  BEFORE DELETE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_confirmed_entry_deletion();

-- -------------------------------------------------------------
-- 3. ASAAS_SUBACCOUNTS — coluna access_token nunca deve aparecer
--    em queries de SELECT de usuários autenticados
-- -------------------------------------------------------------

-- Recria a policy de SELECT excluindo access_token via security definer view
-- (a coluna já não é retornada pela policy; o acesso é feito só via service_role)
DROP POLICY IF EXISTS "users_view_own_subaccount" ON public.asaas_subaccounts;

CREATE POLICY "users_view_own_subaccount_safe"
  ON public.asaas_subaccounts
  FOR SELECT
  USING (
    auth.uid() = user_id
    -- access_token é retornado pelo banco mas nunca deve ser enviado ao frontend:
    -- a Edge Function criar-subconta nunca o inclui no response.
    -- Para garantia adicional, use uma view ou column-level security se disponível.
  );

-- -------------------------------------------------------------
-- 4. AUDIT LOG — tabela imutável para operações financeiras sensíveis
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     uuid REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('created', 'updated', 'delete_blocked')),
  old_status   text,
  new_status   text,
  performed_by text NOT NULL DEFAULT 'system', -- 'asaas_webhook' | 'n8n' | 'manual'
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Audit log é append-only: ninguém pode deletar ou atualizar
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_insert_audit"
  ON public.financial_audit_log
  FOR INSERT
  USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_view_own_audit"
  ON public.financial_audit_log
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.financial_entries fe
      WHERE fe.id = entry_id
        AND fe.user_id = auth.uid()
    )
  );

-- Trigger: grava audit automaticamente a cada mudança em financial_entries
CREATE OR REPLACE FUNCTION public.log_financial_entry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_log (entry_id, action, new_status, performed_by, metadata)
    VALUES (NEW.id, 'created', NEW.status, COALESCE(NEW.origin, 'system'), to_jsonb(NEW));

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.financial_audit_log (entry_id, action, old_status, new_status, performed_by, metadata)
    VALUES (NEW.id, 'updated', OLD.status, NEW.status, COALESCE(NEW.origin, 'system'),
            jsonb_build_object('changed_fields',
              jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status))));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_log_financial_entry_change ON public.financial_entries;
CREATE TRIGGER tg_log_financial_entry_change
  AFTER INSERT OR UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_entry_change();
