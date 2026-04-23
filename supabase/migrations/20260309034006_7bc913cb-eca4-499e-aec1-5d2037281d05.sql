
-- Trigger for clients table (notify on insert/update/delete)
CREATE OR REPLACE FUNCTION public.notify_client_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (NEW.user_id, 'client', 'Novo cliente adicionado', COALESCE('Cliente: ' || NEW.name, 'Um novo cliente foi adicionado'), NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (NEW.user_id, 'client', 'Cliente atualizado', COALESCE('Cliente: ' || NEW.name, 'Um cliente foi atualizado'), NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (OLD.user_id, 'client', 'Cliente removido', COALESCE('Cliente: ' || OLD.name, 'Um cliente foi removido'), OLD.id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers (drop first to be safe)
DROP TRIGGER IF EXISTS on_new_lead ON public.leads;
CREATE TRIGGER on_new_lead AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

DROP TRIGGER IF EXISTS on_new_message ON public.conversations;
CREATE TRIGGER on_new_message AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS on_new_product ON public.products;
CREATE TRIGGER on_new_product AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_new_product();

DROP TRIGGER IF EXISTS on_ai_config_updated ON public.ai_config;
CREATE TRIGGER on_ai_config_updated AFTER UPDATE ON public.ai_config FOR EACH ROW EXECUTE FUNCTION public.notify_ai_config_updated();

DROP TRIGGER IF EXISTS on_client_change ON public.clients;
CREATE TRIGGER on_client_change AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.notify_client_change();

-- Also add product update/delete notifications
CREATE OR REPLACE FUNCTION public.notify_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (NEW.user_id, 'product', 'Produto atualizado', 'Produto: ' || NEW.name, NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (OLD.user_id, 'product', 'Produto removido', 'Produto: ' || OLD.name, OLD.id);
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_product_change ON public.products;
CREATE TRIGGER on_product_change AFTER UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_product_change();
