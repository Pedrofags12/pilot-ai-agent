-- Fix ai_config tone constraint to accept Portuguese values used by frontend
ALTER TABLE public.ai_config DROP CONSTRAINT IF EXISTS ai_config_tone_check;
ALTER TABLE public.ai_config ADD CONSTRAINT ai_config_tone_check 
  CHECK (ai_tone = ANY (ARRAY['amigavel', 'formal', 'persuasivo', 'tecnico', 'friendly', 'formal', 'persuasive', 'technical']));
