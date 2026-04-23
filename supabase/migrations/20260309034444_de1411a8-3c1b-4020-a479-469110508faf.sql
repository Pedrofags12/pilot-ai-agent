
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business_hours" ON public.business_hours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business_hours" ON public.business_hours FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business_hours" ON public.business_hours FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business_hours" ON public.business_hours FOR DELETE USING (auth.uid() = user_id);
