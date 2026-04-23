
-- Add user_id to products for per-user catalogs
ALTER TABLE public.products ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add stock_status column
ALTER TABLE public.products ADD COLUMN stock_status TEXT NOT NULL DEFAULT 'available';

-- Update consultar-produtos to filter by user_id: update RLS if needed
-- Add index for faster lookups
CREATE INDEX idx_products_user_id ON public.products(user_id);
