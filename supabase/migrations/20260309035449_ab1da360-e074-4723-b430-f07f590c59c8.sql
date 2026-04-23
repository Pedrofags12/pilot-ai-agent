
-- Remove access_token column from profiles (security: JWT tokens should never be stored in DB)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS access_token;
