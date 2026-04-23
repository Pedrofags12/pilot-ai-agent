
-- Financial categories table
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial categories" ON public.financial_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial categories" ON public.financial_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial categories" ON public.financial_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial categories" ON public.financial_categories FOR DELETE USING (auth.uid() = user_id);

-- Financial entries table
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'income',
  amount NUMERIC NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial entries" ON public.financial_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial entries" ON public.financial_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial entries" ON public.financial_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial entries" ON public.financial_entries FOR DELETE USING (auth.uid() = user_id);
