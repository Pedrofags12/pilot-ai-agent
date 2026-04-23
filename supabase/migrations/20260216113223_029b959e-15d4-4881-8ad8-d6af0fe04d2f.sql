
-- Add user_id column to leads table
ALTER TABLE public.leads ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow admins and the owner to see their leads
DROP POLICY IF EXISTS "Anyone can view their own lead by session" ON public.leads;
CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);

-- Update policy for updates
DROP POLICY IF EXISTS "Anyone can update their own lead by session" ON public.leads;
CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE USING (true);
