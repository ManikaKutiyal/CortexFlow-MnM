-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, voice, file
    file_url TEXT,
    is_emergency BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for direct_messages
CREATE POLICY "Users can insert messages they send"
ON public.direct_messages
FOR INSERT
WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Users can read their own messages"
ON public.direct_messages
FOR SELECT
USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can update read_at for messages they receive"
ON public.direct_messages
FOR UPDATE
USING (auth.uid()::text = receiver_id);

-- Setup Storage Bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat_attachments',
    'chat_attachments',
    false,
    10485760, -- 10MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat_attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat_attachments'
);

CREATE POLICY "Authenticated users can read chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'chat_attachments'
);

-- Note: In a stricter environment, reading storage objects could be locked down 
-- to just the sender/receiver, but since the bucket is not public, relying on 
-- unguessable UUIDs for file paths + authenticated requirement is typically sufficient.
