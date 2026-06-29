# ASSIST-AI

ASSIST-AI is a calm, step-by-step practice app for everyday situations. This first foundation includes a React scenario catalogue and a small FastAPI backend with static scenario data.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI
- Data: Static typed scenario lists for now

## Current Status

Step 1 - Scenario catalogue foundation

This version includes:

- Landing page
- Scenario catalogue page with category filters
- Scenario detail placeholder page
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
