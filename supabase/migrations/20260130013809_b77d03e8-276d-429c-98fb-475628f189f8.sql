-- Create response_templates table for sales scripts
CREATE TABLE public.response_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage response templates"
  ON public.response_templates
  FOR ALL
  USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_response_templates_updated_at
  BEFORE UPDATE ON public.response_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some default templates
INSERT INTO public.response_templates (title, content, category) VALUES
  ('Boas-vindas', 'Olá! Obrigado pelo interesse em nossos produtos. Como posso ajudá-lo hoje?', 'greeting'),
  ('Solicitar WhatsApp', 'Para agilizar nosso atendimento, poderia me informar seu WhatsApp?', 'contact'),
  ('Oferta Especial', '🔥 Temos uma oferta especial válida só para hoje! Posso te explicar os detalhes?', 'sales'),
  ('Agendar Demonstração', 'Que tal agendarmos uma demonstração gratuita do produto? Qual o melhor horário para você?', 'sales'),
  ('Fechamento', 'Perfeito! Vou preparar tudo para você. Qual a melhor forma de pagamento?', 'closing');