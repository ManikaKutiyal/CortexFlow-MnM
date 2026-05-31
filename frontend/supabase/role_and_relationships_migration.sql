ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('patient','caregiver','provider'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_role_selection BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unique_patient_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS caregiver_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id TEXT NOT NULL REFERENCES users(id),
  patient_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id)
);

CREATE TABLE IF NOT EXISTS provider_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL REFERENCES users(id),
  patient_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, patient_id)
);

ALTER TABLE emergency_events ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE emergency_events ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
