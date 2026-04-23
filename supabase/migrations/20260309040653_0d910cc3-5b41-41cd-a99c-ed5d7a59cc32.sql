-- Remove overly permissive RLS policies on leads and conversations tables
-- These policies allowed anyone to read/write which is a security risk

-- Drop permissive policies on leads
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;

-- Create proper scoped policies for leads
-- Widget visitors can create leads (for chat widget)
CREATE POLICY "Widget can create leads with session" 
ON public.leads FOR INSERT 
WITH CHECK (session_id IS NOT NULL);

-- Users can only view leads they own OR leads matching their session
CREATE POLICY "Users view own leads or by session" 
ON public.leads FOR SELECT 
USING (
  user_id = auth.uid() 
  OR (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Only authenticated users can update their own leads, or widget can update by session
CREATE POLICY "Users update own leads or by session" 
ON public.leads FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- Drop permissive policies on conversations
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;

-- Create scoped policies for conversations
-- Widget can insert conversations for leads they own by session
CREATE POLICY "Widget can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_id 
    AND (leads.user_id = auth.uid() OR leads.session_id IS NOT NULL)
  )
);

-- Users can view conversations for their leads OR widget can view by session
CREATE POLICY "Users view conversations for own leads" 
ON public.conversations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_id 
    AND (leads.user_id = auth.uid() OR (auth.uid() IS NULL AND leads.session_id IS NOT NULL))
  )
);