# ASSIST-AI

ASSIST-AI is a multilingual practice platform that helps learners build confidence in everyday situations through simple, step-by-step scenario guidance. This first foundation includes a polished React landing experience, a scenario catalogue preview, six-language frontend text support, and a small FastAPI backend with static scenario data.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI
- Data: Static typed scenario lists for now

## Current Status

Step 1 - Scenario catalogue foundation

This version includes:

- Landing page
- Scenario catalogue preview page
- Scenario detail placeholder page
- Six-language frontend UI support
- `GET /health`
- `GET /api/scenarios`

It does not include authentication, a database, Gemini, ElevenLabs, or detailed scenario flows yet.

## Run the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

If your backend uses a different URL, copy `frontend/.env.example` to `frontend/.env` and update `VITE_API_BASE_URL`.

## Next Steps

1. Login/Register/Guest mode
2. PostgreSQL database
3. Shopping scenario state-machine
4. Avatar assistant
5. Gemini/ElevenLabs integration
