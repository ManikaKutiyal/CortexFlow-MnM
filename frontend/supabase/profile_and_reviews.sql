-- Enable pg_trgm for smart search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add username to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add vulnerabilities to patient_profiles
ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS vulnerabilities text;

-- Add location and additional photos to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS additional_photos jsonb DEFAULT '[]'::jsonb;

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_reviewer_idx ON public.reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews (reviewee_id);

-- Setup Storage for profile-pics (Requires Storage to be enabled in Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pics', 'profile-pics', true)
ON CONFLICT (id) DO NOTHING;

-- Set up basic security policies for the bucket
-- Allow public access to read profile-pics
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pics');

-- Allow authenticated users to upload their own images
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-pics' AND auth.role() = 'authenticated'
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'profile-pics' AND auth.role() = 'authenticated'
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE USING (
  bucket_id = 'profile-pics' AND auth.role() = 'authenticated'
);
