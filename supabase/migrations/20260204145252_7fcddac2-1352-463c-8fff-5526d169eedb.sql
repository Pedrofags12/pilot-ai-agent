-- Create storage bucket for AI profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-assets', 'ai-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view AI assets (public bucket)
CREATE POLICY "Anyone can view AI assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-assets');

-- Only admins can upload/update/delete AI assets
CREATE POLICY "Admins can manage AI assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-assets' AND is_admin());

CREATE POLICY "Admins can update AI assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ai-assets' AND is_admin());

CREATE POLICY "Admins can delete AI assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'ai-assets' AND is_admin());