-- ================================================================
-- SECURITY & PERFORMANCE HARDENING — CRM module
-- Aplica sobre: scheduled_messages, clients, financial_entries
-- Princípios: least privilege, status invariants, defense in depth,
--             index-first query design
-- ================================================================


-- ----------------------------------------------------------------
-- BLOCO 1 — SCHEDULED_MESSAGES: policies granulares
-- Substitui o FOR ALL genérico por políticas explícitas por operação,
-- com restrições de status embutidas no nível de linha (DB-enforced).
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "users_manage_own_scheduled_messages" ON public.scheduled_messages;

-- Leitura: apenas mensagens do próprio user
CREATE POLICY "sm_select_own"
  ON public.scheduled_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Inserção: user_id deve ser o do token — impossível criar mensagem para outro usuário
CREATE POLICY "sm_insert_own"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualização: apenas mensagens PENDING do próprio user
-- (impede edição de sent/failed/cancelled no banco, não só no frontend)
CREATE POLICY "sm_update_own_pending"
  ON public.scheduled_messages FOR UPDATE
  USING  (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Deleção: apenas mensagens PENDING do próprio user
CREATE POLICY "sm_delete_own_pending"
  ON public.scheduled_messages FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- service_role (n8n): acesso total para criar e avançar status
CREATE POLICY "sm_service_role_all"
  ON public.scheduled_messages FOR ALL
  USING (auth.role() = 'service_role');


-- ----------------------------------------------------------------
-- BLOCO 2 — SCHEDULED_MESSAGES: invariante de status
-- Bloqueia regressões de status no banco, independente de quem chama.
-- Transições válidas: pending → sent | failed | cancelled
-- Transições inválidas: qualquer mudança a partir de sent/failed/cancelled
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_scheduled_message_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mensagens já finalizadas são imutáveis
  IF OLD.status IN ('sent', 'failed', 'cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION
      'Mensagem com status "%" não pode ser alterada. Status final é imutável.',
      OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- pending só pode ir para sent, failed ou cancelled (não pode ficar em pending
  -- se alguém tentar setar um status inválido)
  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'sent', 'failed', 'cancelled') THEN
    RAISE EXCEPTION
      'Transição de status inválida: "%" → "%".',
      OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_sm_status_transition ON public.scheduled_messages;
CREATE TRIGGER tg_sm_status_transition
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enforce_scheduled_message_status_transition();


-- ----------------------------------------------------------------
-- BLOCO 3 — CLIENTS: validação de tags
-- Limita: máximo 20 tags, cada tag entre 1 e 50 caracteres.
-- Previne resource exhaustion e injeção de dados volumosos.
-- ----------------------------------------------------------------

-- Função IMMUTABLE para CHECK constraint (PostgreSQL exige IMMUTABLE para subqueries em CHECK)
CREATE OR REPLACE FUNCTION public.validate_tags(tags text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag text;
BEGIN
  IF tags IS NULL THEN RETURN true; END IF;
  -- Máximo 20 tags
  IF cardinality(tags) > 20 THEN RETURN false; END IF;
  -- Cada tag: 1..50 caracteres, sem espaços à beira
  FOREACH tag IN ARRAY tags LOOP
    IF length(trim(tag)) < 1 OR length(tag) > 50 THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_tags_valid;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_tags_valid
  CHECK (public.validate_tags(tags));


-- ----------------------------------------------------------------
-- BLOCO 4 — CLIENTS: audit trail de deleção
-- Registra toda deleção de cliente (complementa o audit log financeiro).
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid,                         -- pode ser nulo após deleção
  action       text NOT NULL CHECK (action IN ('deleted', 'tags_updated')),
  performed_by uuid,                          -- auth.uid() no momento da ação
  snapshot     jsonb,                         -- cópia dos dados antes da ação
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas service_role insere (trigger SECURITY DEFINER)
CREATE POLICY "cal_service_role_insert"
  ON public.client_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Usuário vê apenas os logs dos seus próprios clientes
CREATE POLICY "cal_user_select_own"
  ON public.client_audit_log FOR SELECT
  USING (performed_by = auth.uid() OR auth.role() = 'service_role');

-- Trigger: grava snapshot antes de DELETE em clients
CREATE OR REPLACE FUNCTION public.log_client_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_audit_log (client_id, action, performed_by, snapshot)
  VALUES (OLD.id, 'deleted', auth.uid(), to_jsonb(OLD));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tg_log_client_deletion ON public.clients;
CREATE TRIGGER tg_log_client_deletion
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_deletion();


-- ================================================================
-- BLOCO 5 — PERFORMANCE INDEXES
-- Todos com IF NOT EXISTS para ser idempotente (re-run safe).
-- ================================================================

-- 5.1  clients — listagem principal (Clientes.tsx): user_id + created_at DESC
--      Cobre: SELECT ... WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_clients_user_created
  ON public.clients (user_id, created_at DESC);

-- 5.2  clients — busca por nome dentro do user (search box)
--      Cobre: WHERE user_id = ? AND name ILIKE '%...%'
--      (pg_trgm não está garantido; índice cobre pelo menos a parte do user_id)
CREATE INDEX IF NOT EXISTS idx_clients_user_name
  ON public.clients (user_id, name text_pattern_ops);

-- 5.3  clients.tags — GIN para buscas por tag individual
--      Cobre: WHERE 'tag' = ANY(tags)  /  WHERE tags @> ARRAY['tag']
CREATE INDEX IF NOT EXISTS idx_clients_tags_gin
  ON public.clients USING GIN (tags);

-- 5.4  scheduled_messages — query global da aba "Mensagens Agendadas"
--      Cobre: WHERE user_id = ? ORDER BY scheduled_at
CREATE INDEX IF NOT EXISTS idx_sm_user_scheduled
  ON public.scheduled_messages (user_id, scheduled_at ASC);

-- 5.5  scheduled_messages — n8n scheduler: busca pendentes a disparar
--      Partial index: apenas linhas pending — drasticamente menor
--      Cobre: WHERE status = 'pending' AND scheduled_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_sm_pending_scheduled
  ON public.scheduled_messages (scheduled_at ASC)
  WHERE status = 'pending';

-- 5.6  scheduled_messages — detalhe do cliente (ClienteDetalhe.tsx)
--      Cobre: WHERE client_id = ? AND status = 'pending' ORDER BY scheduled_at
CREATE INDEX IF NOT EXISTS idx_sm_client_status_scheduled
  ON public.scheduled_messages (client_id, status, scheduled_at ASC)
  WHERE client_id IS NOT NULL;

-- 5.7  financial_entries — CobrancaCard query
--      Cobre: WHERE client_id = ? AND status IN ('pending','confirmed','overdue')
--             ORDER BY created_at DESC LIMIT 5
CREATE INDEX IF NOT EXISTS idx_fe_client_status_created
  ON public.financial_entries (client_id, status, created_at DESC)
  WHERE client_id IS NOT NULL;


-- ================================================================
-- BLOCO 6 — COMENTÁRIOS DE SEGURANÇA (documenta decisões para DBA)
-- ================================================================

COMMENT ON POLICY "sm_update_own_pending" ON public.scheduled_messages IS
  'Garante que usuários autenticados só editem mensagens PENDING. '
  'Mensagens sent/failed/cancelled são imutáveis — reforçado também pelo trigger tg_sm_status_transition.';

COMMENT ON POLICY "sm_service_role_all" ON public.scheduled_messages IS
  'n8n usa service_role para criar mensagens agendadas e avançar status. '
  'Sempre deve incluir user_id correto no payload.';

COMMENT ON FUNCTION public.enforce_scheduled_message_status_transition() IS
  'Invariante de status: sent/failed/cancelled são terminais. '
  'pending pode ir para sent, failed ou cancelled. Nenhuma regressão permitida.';

COMMENT ON FUNCTION public.validate_tags(text[]) IS
  'Valida array de tags: máximo 20 itens, cada um com 1-50 caracteres. '
  'Usada como CHECK constraint em clients.tags para prevenir resource exhaustion.';

COMMENT ON TABLE public.client_audit_log IS
  'Audit trail imutável para operações destrutivas em clients. '
  'Complementa financial_audit_log. Append-only via SECURITY DEFINER trigger.';
