-- Adiciona external_message_id em conversations para dedup por ID real do Uazapi.
-- Substitui a janela de 60s por UNIQUE constraint — muito mais confiável.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text'
    CHECK (media_type IN ('text', 'audio', 'image', 'document'));

-- Unique constraint: mesmo messageid nunca entra duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external_message_id
  ON public.conversations (external_message_id)
  WHERE external_message_id IS NOT NULL;
