
-- Clients table - created automatically when a lead is converted
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  region TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all clients" ON public.clients FOR ALL USING (is_admin());

-- Trigger: auto-create client when lead status changes to 'converted'
CREATE OR REPLACE FUNCTION public.handle_lead_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'converted' AND (OLD.status IS NULL OR OLD.status <> 'converted') THEN
    INSERT INTO public.clients (user_id, lead_id, name, phone, region, product_id)
    VALUES (
      COALESCE(NEW.user_id, auth.uid()),
      NEW.id,
      NEW.name,
      NEW.phone,
      NEW.region,
      NEW.product_interest
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_converted
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_converted();
