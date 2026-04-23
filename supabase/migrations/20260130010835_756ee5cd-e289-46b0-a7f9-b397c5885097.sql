-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that doesn't cause recursion by using a security definer function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Recreate admin policy using the function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin() OR id = auth.uid());

-- Also fix other tables that use the same pattern
DROP POLICY IF EXISTS "Admins can manage all conversations" ON public.conversations;
CREATE POLICY "Admins can manage all conversations" 
ON public.conversations 
FOR ALL 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
CREATE POLICY "Admins can manage all leads" 
ON public.leads 
FOR ALL 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (public.is_admin());

-- Allow admins to view all products (including inactive)
CREATE POLICY "Admins can view all products" 
ON public.products 
FOR SELECT 
USING (public.is_admin() OR active = true);