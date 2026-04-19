# Backend

This package contains the CortexFlow FastAPI service for deterministic speech-language analysis and report generation.

## Responsibilities

- Validate transcript or text input
- Compute lexical, semantic, prosody, syntax, and affective markers
- Produce confidence notes and overall cognitive-load estimates
- Stream stepwise progress and final report payloads
- Use Gemini only for careful summary synthesis, not score fabrication

## Environment

Create `backend/.env` from `backend/.env.example`.

```env
GEMINI_API_KEY=
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_SECONDS=40
MODEL_DISCOVERY_TTL_SECONDS=900
GEMINI_REASONING_CANDIDATES=gemini-2.5-flash,gemini-2.0-flash
GEMINI_SAFETY_CANDIDATES=gemini-2.5-flash,gemini-2.0-flash
GEMINI_REASONING_MODEL=gemini-2.5-flash
GEMINI_SAFETY_MODEL=gemini-2.5-flash
MIN_WORDS_REQUIRED=3
```

## Commands

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API

- `GET /health`
- `GET /models/recommended`
- `POST /analyze`

Example payload:

```json
{
  "input_value": "optional text input",
  "transcript": "optional transcript input",
  "pause_map": [0.32, 0.45],
  "audio_duration": 24.8,
  "session_id": "optional"
}
```

The `POST /analyze` response is streamed as NDJSON events.

