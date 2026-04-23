![CortexFlow Banner](frontend/public/images/CortexFlow%20(1).png)

CortexFlow is a full-stack cognitive signal analysis platform built for fast screening workflows from text and speech. It combines browser-based voice capture, Gemini-powered transcription, deterministic linguistic feature extraction, and a report interface that maps output to domain-level brain-region signals.

## What It Does

- Accepts typed input or recorded speech
- Transcribes audio through Gemini-compatible APIs
- Scores five analysis domains: lexical, semantic, prosody, syntax, and affective markers
- Streams a structured report with confidence notes and non-diagnostic safety framing
- Visualizes biomarker intensity inside an interactive 3D brain workspace
- Supports authentication and report history through Firebase and Supabase

## Why This Repo Is Hackathon-Ready

- Monorepo with clear frontend and backend boundaries
- No proprietary or submission-hostile top-level legal artifacts
- Local demo path available with auth bypass for judging environments
- Deployment-friendly split for Vercel frontend and containerized backend

## Architecture

1. The `frontend` Next.js app handles UI, authentication, audio upload, report history, and proxy API routes.
2. `POST /api/transcribe` sends recorded audio to Gemini and extracts transcript plus pause-map timing.
3. `POST /api/analyze` forwards normalized input to the FastAPI backend.
4. The `backend` service computes deterministic biomarkers, derives cognitive load, and streams the final report payload back to the UI.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts, Three.js
- Backend: FastAPI, Pydantic, httpx, Python 3.11+
- AI layer: Gemini API for transcription and report-safe summary generation
- Data layer: Firebase Auth and Supabase for user/session persistence
- Deployment target: Vercel for frontend, Docker-capable backend host for API

## Repository Structure

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── libs/
│   ├── public/
│   ├── supabase/
│   ├── package.json
│   └── Dockerfile
├── .gitignore
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Gemini API key
- Firebase and Supabase credentials if you want full auth and history support

### 1. Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

Required fields for a full run:

```env
GEMINI_API_KEY=
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
GEMINI_TRANSCRIBE_MODEL=gemini-2.0-flash
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_WAKE_ENABLED=true
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Run it:

```bash
cd frontend
npm ci
npm run dev
```

### 2. Backend

Create `backend/.env` from `backend/.env.example`.

```env
GEMINI_API_KEY=
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_SECONDS=40
MODEL_DISCOVERY_TTL_SECONDS=900
GEMINI_REASONING_CANDIDATES=gemini-2.0-flash,gemini-1.5-flash
GEMINI_SAFETY_CANDIDATES=gemini-2.0-flash,gemini-1.5-flash
GEMINI_REASONING_MODEL=gemini-2.0-flash
GEMINI_SAFETY_MODEL=gemini-2.0-flash
MIN_WORDS_REQUIRED=3
```

Run it:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Demo Flow

1. Start the backend on `http://localhost:8000`.
2. Start the frontend on `http://localhost:3000`.
3. Use text input or voice recording.
4. Review streamed cognitive analysis, regional activations, and generated report output.

## API Overview

- Frontend routes
  - `POST /api/transcribe`
  - `POST /api/analyze`
  - `POST /api/wake-backend`
  - `GET /api/wake-backend`
  - Auth and report routes under `frontend/src/app/api`
- Backend routes
  - `GET /health`
  - `GET /models/recommended`
  - `POST /analyze`

## Team

- Manika Kutiyal
- Aditya Verma

## Submission Notes

- The repository is structured to be judged as a working hackathon project rather than a private internal codebase.
- Authentication can be bypassed in demo setups with `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.
- The backend output is explicitly non-diagnostic and intended for screening/demo workflows.
