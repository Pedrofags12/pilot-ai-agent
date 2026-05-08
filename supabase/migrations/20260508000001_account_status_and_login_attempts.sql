-- ================================================================
-- AUTH HARDENING: account_status + login_attempts
-- ================================================================

-- ----------------------------------------------------------------
-- 1. account_status ENUM
-- ----------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending', 'waitlist', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'pending';

-- Usuários que já completaram onboarding → aprovados automaticamente
-- (não quebra acessos existentes)
UPDATE public.profiles
  SET account_status = 'approved'
  WHERE onboarding_completed = true
    AND account_status = 'pending';

-- Índice para a query do route guard (chamada em toda navegação autenticada)
CREATE INDEX IF NOT EXISTS idx_profiles_id_status
  ON public.profiles (id, account_status);


-- ----------------------------------------------------------------
-- 2. login_attempts — rate limiting / brute-force audit
-- Escrito apenas por service_role (Edge Function).
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL,
  ip_address   text,
  user_agent   text,
  success      boolean     NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- service_role escreve (chamado pela Edge Function de auth)
CREATE POLICY "la_service_role_all"
  ON public.login_attempts FOR ALL
  USING (auth.role() = 'service_role');

-- Usuário autenticado pode ver seus próprios registros (suporte/auditoria)
CREATE POLICY "la_user_select_own"
  ON public.login_attempts FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Partial index: apenas falhas recentes — tabela cresce mas índice não
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_fail
  ON public.login_attempts (email, attempted_at DESC)
  WHERE success = false;

-- Função para checar rate limit: retorna true se email está bloqueado
-- (≥ 5 falhas nos últimos 15 minutos)
CREATE OR REPLACE FUNCTION public.is_login_rate_limited(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) >= 5
  FROM public.login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';
$$;

COMMENT ON TABLE public.login_attempts IS
  'Audit trail de tentativas de login. Escrito via service_role pela Edge Function. '
  'Limpeza recomendada: DELETE WHERE attempted_at < NOW() - INTERVAL ''30 days''';

COMMENT ON FUNCTION public.is_login_rate_limited IS
  'Retorna true se o email teve >= 5 falhas nos últimos 15 minutos. '
  'Chamado pela Edge Function de auth antes de processar o login.';
