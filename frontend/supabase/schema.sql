-- Users authenticated via Firebase are mirrored here.
create table if not exists public.users (
  id text primary key,
  email text,
  display_name text,
  photo_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists users_email_idx on public.users (email);

-- Analysis reports are scoped by user_id for account-level history.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  input_type text not null check (input_type in ('text', 'transcript')),
  input_snippet text not null,
  scores jsonb not null,
  report jsonb not null,
  session_id text not null,
  word_timestamps jsonb,
  audio_duration double precision
);

create index if not exists reports_user_id_created_at_idx on public.reports (user_id, created_at desc);

-- Local email/password credentials used for non-Google auth.
create table if not exists public.user_credentials (
  user_id text primary key references public.users(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_credentials_email_idx on public.user_credentials (email);

-- Persistent web sessions for local auth via secure HTTP-only cookie.
create table if not exists public.auth_sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists auth_sessions_user_id_idx on public.auth_sessions (user_id);
create index if not exists auth_sessions_expires_at_idx on public.auth_sessions (expires_at);

-- Role + profile expansion for LovedOnes features
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('patient', 'caregiver', 'provider');
  end if;
end $$;

alter table public.users
  add column if not exists role user_role,
  add column if not exists needs_role_selection boolean not null default true,
  add column if not exists role_selected_at timestamptz,
  add column if not exists phone text,
  add column if not exists timezone text default 'UTC',
  add column if not exists locale text;

create index if not exists users_role_idx on public.users (role);

create table if not exists public.user_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  emergency_contact_name text,
  emergency_contact_phone text,
  address text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  primary_caregiver_id text references public.users(id),
  primary_provider_id text references public.users(id),
  condition_notes text,
  diagnosis_stage text,
  medications jsonb,
  allergies jsonb,
  preferred_language text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_profiles_primary_caregiver_idx on public.patient_profiles (primary_caregiver_id);
create index if not exists patient_profiles_primary_provider_idx on public.patient_profiles (primary_provider_id);

create table if not exists public.caregiver_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  patient_id text unique references public.users(id) on delete set null,
  relationship text,
  permissions jsonb,
  alert_preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  org_name text,
  specialty text,
  license_id text,
  patient_capacity int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caregiver_patient_links (
  id uuid primary key default gen_random_uuid(),
  caregiver_id text not null references public.users(id) on delete cascade,
  patient_id text not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  unique (caregiver_id)
);

create index if not exists caregiver_patient_links_patient_idx on public.caregiver_patient_links (patient_id);

create table if not exists public.provider_patient_links (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.users(id) on delete cascade,
  patient_id text not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  unique (provider_id, patient_id)
);

create index if not exists provider_patient_links_patient_idx on public.provider_patient_links (patient_id);

create table if not exists public.patient_records (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  uploaded_by text references public.users(id),
  record_type text not null check (record_type in ('prescription', 'lab', 'image', 'note', 'other')),
  title text not null,
  description text,
  file_path text,
  mime_type text,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists patient_records_patient_idx on public.patient_records (patient_id);
create index if not exists patient_records_type_idx on public.patient_records (record_type);

create table if not exists public.patient_memories (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  created_by text references public.users(id),
  title text not null,
  description text,
  media_path text,
  media_type text check (media_type in ('image', 'audio', 'video', 'text')),
  recorded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists patient_memories_patient_idx on public.patient_memories (patient_id);

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  memory_id uuid references public.patient_memories(id) on delete set null,
  speaker_name text,
  relationship text,
  duration_seconds numeric,
  file_path text,
  transcript text,
  created_at timestamptz not null default now()
);

create index if not exists voice_notes_patient_idx on public.voice_notes (patient_id);

create table if not exists public.emergency_events (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  triggered_by text references public.users(id),
  location text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  details jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists emergency_events_patient_idx on public.emergency_events (patient_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null references public.users(id) on delete cascade,
  sender_id text references public.users(id),
  patient_id text references public.users(id),
  type text not null,
  title text not null,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id);
create index if not exists notifications_patient_idx on public.notifications (patient_id);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  created_by text references public.users(id),
  assigned_to text references public.users(id),
  task_type text not null check (task_type in ('medication', 'appointment', 'exercise', 'checkin', 'general')),
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists care_tasks_patient_idx on public.care_tasks (patient_id);
create index if not exists care_tasks_assigned_to_idx on public.care_tasks (assigned_to);

create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null references public.users(id) on delete cascade,
  source text,
  metric_name text not null,
  metric_value numeric,
  unit text,
  measured_at timestamptz not null default now(),
  payload jsonb
);

create index if not exists health_metrics_patient_idx on public.health_metrics (patient_id);
create index if not exists health_metrics_name_idx on public.health_metrics (metric_name);

create index if not exists care_tasks_status_idx on public.care_tasks (patient_id, status);
