-- Gari Digital: limpeza de dados com mais de 30 dias.
-- Regra do PRD: banco de dados limpo a cada 30 dias.
-- Executar via Supabase cron (pg_cron) ou job agendado no n8n.

-- Remove conversas antigas de leads não convertidos
DELETE FROM public.conversations
WHERE created_at < now() - interval '30 days'
  AND lead_id IN (
    SELECT id FROM public.leads
    WHERE status NOT IN ('converted')
  );

-- Remove notificações lidas com mais de 30 dias
DELETE FROM public.notifications
WHERE created_at < now() - interval '30 days'
  AND read = true;

-- Remove logs de registro com mais de 30 dias
DELETE FROM public.registration_logs
WHERE created_at < now() - interval '30 days';
