
-- 1. Limpar vínculos antes de remover colunas
UPDATE public.leads SET product_interest = NULL WHERE product_interest IS NOT NULL;
UPDATE public.clients SET product_id = NULL WHERE product_id IS NOT NULL;

-- 2. Remover triggers e funções de produtos
DROP TRIGGER IF EXISTS notify_product_change_trigger ON public.products;
DROP TRIGGER IF EXISTS notify_new_product_trigger ON public.products;
DROP FUNCTION IF EXISTS public.notify_product_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_new_product() CASCADE;

-- 3. Remover colunas e FKs relacionadas a produtos
ALTER TABLE public.leads DROP COLUMN IF EXISTS product_interest;
ALTER TABLE public.clients DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.clients DROP COLUMN IF EXISTS sale_type;

-- 4. Remover função handle_lead_converted (referencia product_interest) e recriar sem produto
DROP FUNCTION IF EXISTS public.handle_lead_converted() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_lead_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'converted' AND (OLD.status IS NULL OR OLD.status <> 'converted') THEN
    INSERT INTO public.clients (user_id, lead_id, name, phone, region)
    VALUES (
      COALESCE(NEW.user_id, auth.uid()),
      NEW.id,
      NEW.name,
      NEW.phone,
      NEW.region
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER handle_lead_converted_trigger
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_lead_converted();

-- 5. Remover a tabela products
DROP TABLE IF EXISTS public.products CASCADE;
