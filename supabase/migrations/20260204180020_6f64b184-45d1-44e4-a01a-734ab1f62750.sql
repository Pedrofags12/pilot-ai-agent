-- Add user_id column to ai_config with FK to auth.users
ALTER TABLE public.ai_config 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add UNIQUE constraint on user_id (one config per user)
ALTER TABLE public.ai_config 
ADD CONSTRAINT ai_config_user_id_unique UNIQUE (user_id);

-- Rename columns to match new naming convention
ALTER TABLE public.ai_config RENAME COLUMN tone TO ai_tone;
ALTER TABLE public.ai_config RENAME COLUMN model TO ai_model;
ALTER TABLE public.ai_config RENAME COLUMN company_logo_url TO profile_image_url;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Admins can manage AI config" ON public.ai_config;
DROP POLICY IF EXISTS "Anyone can view AI config" ON public.ai_config;

-- Create new RLS policies for user-owned config
-- Users can view their own config
CREATE POLICY "Users can view own ai_config" 
ON public.ai_config 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own ai_config" 
ON public.ai_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own ai_config" 
ON public.ai_config 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own config
CREATE POLICY "Users can delete own ai_config" 
ON public.ai_config 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can still view all configs (for admin dashboard)
CREATE POLICY "Admins can view all ai_config" 
ON public.ai_config 
FOR SELECT 
USING (is_admin());