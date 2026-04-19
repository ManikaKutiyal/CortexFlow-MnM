# Frontend (Next.js)

This package contains the CortexFlow interaction layer and visualization workspace.

Joint collaboration repository by the MnM group.

Private codebase. Licensing context is defined in [../LICENSE](../LICENSE).

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Recharts + Three.js
- Groq OpenAI-compatible transcription API

## Environment Variables

`.env.local` fields:

```env
GROQ_API_KEY=
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_WAKE_ENABLED=true

# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## API Surface

- `POST /api/transcribe`: audio upload and Groq transcription
- `POST /api/analyze`: proxy to backend analysis endpoint at `BACKEND_URL`
- `POST /api/wake-backend`: best-effort health ping to reduce cold-start delay
- `GET /api/wake-backend`: backend readiness status for launch-screen gating
- `POST /api/account/bootstrap`: Firebase-authenticated account upsert into Supabase
- `GET /api/reports`: fetch signed-in user reports from Supabase
- `POST /api/reports`: persist a report for the signed-in user
- `DELETE /api/reports/[id]`: delete one report for signed-in user
- `DELETE /api/reports/clear`: clear signed-in user report history

## Supabase SQL Setup

Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor before starting the app.

## Hosting Profile

- Frontend platform: Vercel
- Vercel root directory: `frontend`
- Backend target: Hugging Face Spaces (Docker)

Typical Vercel variables:

- `GROQ_API_KEY`
- `GROQ_TRANSCRIBE_MODEL`
- `BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_WAKE_ENABLED`

## Local Development Reference

```bash
npm ci
npm run dev
```

Create `frontend/.env.local` manually with the variables listed above before running the dev server.

