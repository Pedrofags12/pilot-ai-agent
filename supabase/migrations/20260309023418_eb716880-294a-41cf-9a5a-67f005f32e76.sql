
CREATE TABLE public.registration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  full_name text,
  phone text,
  company_name text,
  cnpj text,
  commercial_phone text,
  address text,
  employee_count text,
  avg_clients text,
  service_area text,
  business_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all registration logs" ON public.registration_logs
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Authenticated users can insert own log" ON public.registration_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
