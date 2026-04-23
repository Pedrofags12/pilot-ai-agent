-- Create AI configuration table
CREATE TABLE public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL DEFAULT 'Atendente Pilot',
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente de vendas amigável e prestativo.',
  tone TEXT NOT NULL DEFAULT 'friendly' CHECK (tone IN ('friendly', 'formal', 'persuasive', 'technical')),
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  company_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage AI config
CREATE POLICY "Admins can manage AI config"
  ON public.ai_config
  FOR ALL
  USING (is_admin());

-- Anyone can view AI config (needed for chatbot)
CREATE POLICY "Anyone can view AI config"
  ON public.ai_config
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_config_updated_at
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default config
INSERT INTO public.ai_config (agent_name, system_prompt, tone, model) VALUES
  ('Atendente Pilot', 'Você é um assistente de vendas amigável e prestativo. Ajude os clientes a encontrar o produto ideal para suas necessidades.', 'friendly', 'gpt-4o');

-- Create invoices table for subscription history
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Only admins can view invoices
CREATE POLICY "Admins can view invoices"
  ON public.invoices
  FOR SELECT
  USING (is_admin());

-- Insert sample invoices
INSERT INTO public.invoices (description, amount, status, due_date, paid_at) VALUES
  ('Assinatura Pilot Pro - Janeiro 2026', 197.00, 'paid', '2026-01-05', '2026-01-05 10:00:00+00'),
  ('Assinatura Pilot Pro - Dezembro 2025', 197.00, 'paid', '2025-12-05', '2025-12-05 09:30:00+00'),
  ('Assinatura Pilot Pro - Novembro 2025', 197.00, 'paid', '2025-11-05', '2025-11-05 11:15:00+00');