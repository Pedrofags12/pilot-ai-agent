
CREATE OR REPLACE FUNCTION public.increment_unread(_lead_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.leads
  SET unread_count = unread_count + 1
  WHERE id = _lead_id;
$$;
