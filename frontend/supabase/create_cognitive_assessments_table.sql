-- Run this script in the Supabase SQL Editor to create the cognitive_assessments table

CREATE TABLE IF NOT EXISTS cognitive_assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('memory_quiz', 'speech_analysis')),
    score NUMERIC NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE cognitive_assessments ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own assessments
CREATE POLICY "Users can view their own cognitive assessments"
    ON cognitive_assessments FOR SELECT
    USING (auth.uid()::text = patient_id);

-- Note: Inserting is done via the Next.js server-side API using the Service Role Key, 
-- so we don't strictly need an INSERT policy for the anonymous/authenticated role, 
-- but if we want to allow direct client inserts:
CREATE POLICY "Users can insert their own cognitive assessments"
    ON cognitive_assessments FOR INSERT
    WITH CHECK (auth.uid()::text = patient_id);

-- Optional: Create an index for faster lookups by patient
CREATE INDEX IF NOT EXISTS idx_cognitive_assessments_patient_id ON cognitive_assessments(patient_id);
