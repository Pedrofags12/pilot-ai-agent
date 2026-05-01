-- ================================================================
-- SECURITY & PERFORMANCE HARDENING — public.leads
-- Trata o schema real de produção:
--   id, nome_cliente, telefone, mensagem_original, transcricao_audio,
--   analise_ia, status, criticidade, etapa, criado_em,
--   user_id TEXT (→ uuid), last_invoice_id, payment_status,
--   asaas_customer_id
-- ================================================================


-- ----------------------------------------------------------------
-- BLOCO 0 — PRÉ-VALIDAÇÃO (seguro: apenas lê, não altera nada)
-- Antes de qualquer mudança estrutural, reporta o estado dos dados.
-- ----------------------------------------------------------------

DO $$
DECLARE
  v_invalid_uids   int;
  v_null_uids      int;
  v_total          int;
BEGIN
  SELECT count(*) INTO v_total FROM public.leads;

  -- user_ids que NÃO são UUIDs válidos (serão perdidos no cast, se existirem)
  SELECT count(*) INTO v_invalid_uids
  FROM public.leads
  WHERE user_id IS NOT NULL
    AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT count(*) INTO v_null_uids
  FROM public.leads WHERE user_id IS NULL;

  RAISE NOTICE '=== PRÉ-VALIDAÇÃO leads ===';
  RAISE NOTICE 'Total de leads: %', v_total;
  RAISE NOTICE 'user_ids NULL: %', v_null_uids;
  RAISE NOTICE 'user_ids com formato inválido (bloqueará o cast): %', v_invalid_uids;

  IF v_invalid_uids > 0 THEN
    RAISE EXCEPTION
      'Existem % linhas com user_id inválido (não é UUID). '
      'Corrija antes de continuar: '
      'SELECT id, user_id FROM leads WHERE user_id IS NOT NULL '
      'AND user_id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'';',
      v_invalid_uids;
  END IF;
END
$$;


-- ----------------------------------------------------------------
-- BLOCO 1 — COLUNA atualizado_em + trigger de auto-update
-- Necessário para rastrear modificações sem depender do n8n.
-- ----------------------------------------------------------------

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

-- Usa a função handle_updated_at() já existente no schema
CREATE OR REPLACE FUNCTION public.set_leads_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_leads_atualizado_em ON public.leads;
CREATE TRIGGER tg_leads_atualizado_em
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_leads_atualizado_em();


-- ----------------------------------------------------------------
-- BLOCO 2 — user_id TEXT → UUID
-- Requer que todos os user_ids sejam UUID válidos (verificado no Bloco 0).
-- Colunas NULL permanecem NULL (FK nullable).
-- ----------------------------------------------------------------

DO $$
BEGIN
  -- Só executa se ainda for texto (idempotente)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leads'
      AND column_name  = 'user_id'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE public.leads
      ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

    RAISE NOTICE 'user_id convertido: text → uuid';
  ELSE
    RAISE NOTICE 'user_id já é uuid, pulando conversão.';
  END IF;
END
$$;

-- FK com NOT VALID: garante integridade para inserções futuras
-- sem bloquear se houver linhas órfãs antigas (referenciam users deletados)
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  NOT VALID;

-- Valida apenas as novas linhas; não trava tabela em produção
-- (para validar as existentes depois: ALTER TABLE leads VALIDATE CONSTRAINT leads_user_id_fkey;)


-- ----------------------------------------------------------------
-- BLOCO 3 — RLS: LIMPA TODAS AS POLICIES HISTÓRICAS
-- A tabela acumulou policies conflitantes ao longo de migrations.
-- Drop por nome explícito para não deixar nenhuma aberta.
-- ----------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Históricas permissivas (abertas com USING(true)):
DROP POLICY IF EXISTS "Anyone can create leads"                     ON public.leads;
DROP POLICY IF EXISTS "Anyone can update their own lead by session" ON public.leads;
DROP POLICY IF EXISTS "Anyone can view their own lead by session"   ON public.leads;
DROP POLICY IF EXISTS "Anyone can view leads"                       ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads"                     ON public.leads;

-- Session-based (não se aplicam mais ao schema atual):
DROP POLICY IF EXISTS "Widget can create leads with session"        ON public.leads;
DROP POLICY IF EXISTS "Users view own leads or by session"          ON public.leads;
DROP POLICY IF EXISTS "Users update own leads or by session"        ON public.leads;

-- Admin genérica:
DROP POLICY IF EXISTS "Admins can manage all leads"                 ON public.leads;

-- Qualquer outra que possa existir com nomes diferentes:
DROP POLICY IF EXISTS "leads_select_own"      ON public.leads;
DROP POLICY IF EXISTS "leads_insert_own"      ON public.leads;
DROP POLICY IF EXISTS "leads_update_own"      ON public.leads;
DROP POLICY IF EXISTS "leads_delete_own"      ON public.leads;
DROP POLICY IF EXISTS "leads_service_role"    ON public.leads;


-- ----------------------------------------------------------------
-- BLOCO 4 — RLS: NOVAS POLICIES (least privilege)
-- ----------------------------------------------------------------

-- service_role: acesso irrestrito (n8n, Edge Functions, webhooks)
CREATE POLICY "leads_service_role"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role');

-- SELECT: consultores veem apenas seus próprios leads
CREATE POLICY "leads_select_own"
  ON public.leads FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user_id deve corresponder ao token — impede criação de leads
--         para outro usuário via cliente autenticado
CREATE POLICY "leads_insert_own"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: apenas leads do próprio usuário
CREATE POLICY "leads_update_own"
  ON public.leads FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: apenas leads do próprio usuário
-- Leads convertidos em clientes ficam vinculados via FK (clients.lead_id),
-- então ON DELETE SET NULL na FK de clients garante que a deleção não quebra o CRM.
CREATE POLICY "leads_delete_own"
  ON public.leads FOR DELETE
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- BLOCO 5 — CHECK CONSTRAINTS (status, criticidade, etapa)
-- Só adiciona se a tabela não tiver dados fora do conjunto esperado.
-- Se falhar, rode: SELECT DISTINCT status FROM leads; e ajuste os valores.
-- ----------------------------------------------------------------

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IS NULL OR status IN (
    'novo', 'em_atendimento', 'aguardando_resposta',
    'convertido', 'cancelado', 'perdido', 'qualificado'
  ));

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_criticidade_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_criticidade_check
  CHECK (criticidade IS NULL OR criticidade IN (
    'baixa', 'normal', 'alta', 'urgente'
  ));

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_etapa_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_etapa_check
  CHECK (etapa IS NULL OR etapa IN (
    'pendente', 'qualificacao', 'proposta',
    'negociacao', 'fechamento', 'convertido', 'perdido'
  ));


-- ================================================================
-- BLOCO 6 — PERFORMANCE INDEXES
-- Todos com IF NOT EXISTS — idempotente (re-run safe).
-- Nomes refletem o schema real (colunas em português).
-- ================================================================

-- 6.1  Listagem principal do painel (ORDER BY criado_em DESC por user)
--      Cobre: WHERE user_id = ? ORDER BY criado_em DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_leads_user_criado
  ON public.leads (user_id, criado_em DESC);

-- 6.2  Filtro por status (tab "novo", "em_atendimento", etc.)
--      Cobre: WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_leads_user_status
  ON public.leads (user_id, status)
  WHERE status IS NOT NULL;

-- 6.3  Pipeline de etapas (kanban / funil)
--      Cobre: WHERE user_id = ? AND etapa = ?
CREATE INDEX IF NOT EXISTS idx_leads_user_etapa
  ON public.leads (user_id, etapa)
  WHERE etapa IS NOT NULL;

-- 6.4  Filtro por criticidade (triagem de urgentes)
--      Cobre: WHERE user_id = ? AND criticidade = ?
CREATE INDEX IF NOT EXISTS idx_leads_user_criticidade
  ON public.leads (user_id, criticidade)
  WHERE criticidade IS NOT NULL;

-- 6.5  Busca / deduplicação por telefone
--      Cobre: WHERE telefone = ? (para evitar leads duplicados via n8n)
CREATE INDEX IF NOT EXISTS idx_leads_telefone
  ON public.leads (telefone)
  WHERE telefone IS NOT NULL;

-- 6.6  Lookup pelo Asaas customer ID (webhook de pagamento)
--      Cobre: WHERE asaas_customer_id = ?
CREATE INDEX IF NOT EXISTS idx_leads_asaas_customer
  ON public.leads (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- 6.7  Lookup por invoice (reconciliação Asaas)
--      Cobre: WHERE last_invoice_id = ?
CREATE INDEX IF NOT EXISTS idx_leads_last_invoice
  ON public.leads (last_invoice_id)
  WHERE last_invoice_id IS NOT NULL;

-- 6.8  GIN no JSONB de análise de IA (queries por campos específicos)
--      Cobre: WHERE analise_ia @> '{"campo": "valor"}'
--             WHERE analise_ia ? 'campo'
CREATE INDEX IF NOT EXISTS idx_leads_analise_ia_gin
  ON public.leads USING GIN (analise_ia)
  WHERE analise_ia IS NOT NULL;

-- 6.9  atualizado_em por usuário (ordenar por mais recentemente modificado)
--      Cobre: WHERE user_id = ? ORDER BY atualizado_em DESC
CREATE INDEX IF NOT EXISTS idx_leads_user_atualizado
  ON public.leads (user_id, atualizado_em DESC);


-- ================================================================
-- BLOCO 7 — COMENTÁRIOS DE AUDITORIA
-- ================================================================

COMMENT ON COLUMN public.leads.user_id IS
  'UUID do consultor dono deste lead. '
  'FK NOT VALID — novos inserts são validados; linhas antigas podem referenciar users deletados. '
  'Para validar histórico: ALTER TABLE leads VALIDATE CONSTRAINT leads_user_id_fkey;';

COMMENT ON COLUMN public.leads.atualizado_em IS
  'Timestamp de última modificação. Preenchido automaticamente pelo trigger tg_leads_atualizado_em.';

COMMENT ON POLICY "leads_service_role" ON public.leads IS
  'service_role tem acesso irrestrito. '
  'Usado por n8n (webhooks WhatsApp/Asaas) e Edge Functions. '
  'NUNCA exponha a service_role key no frontend.';

COMMENT ON POLICY "leads_select_own" ON public.leads IS
  'Consultores autenticados veem APENAS seus próprios leads. '
  'Corrige o histórico de policies USING(true) que expunham todos os leads a qualquer usuário.';
