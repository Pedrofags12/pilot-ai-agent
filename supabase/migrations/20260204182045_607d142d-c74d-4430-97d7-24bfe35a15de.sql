-- Add access_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN access_token text;

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();