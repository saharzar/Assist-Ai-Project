# ASSIST-AI

ASSIST-AI is a multilingual practice platform that helps learners build confidence in everyday situations through simple, step-by-step scenario guidance. The current foundation includes a polished React landing experience, authentication, guest mode, user category selection, a PostgreSQL-backed FastAPI API, and a scenario catalogue preview.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Alembic, JWT authentication
- Database: PostgreSQL via Docker Compose
- Data: Static typed scenario lists plus persisted users and guest sessions

## Current Status

Step 2 - Authentication and database foundation

This version includes:

- Landing page
- Register, login, guest consent, and profile pages
- JWT authentication
- PostgreSQL users and guest sessions
- User category selection during sign up
- Scenario catalogue preview page
- Scenario detail placeholder page
- Six-language frontend UI support
- `GET /health`
- `GET /api/scenarios`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guests/session`

It does not include Gemini, ElevenLabs, or detailed scenario flows yet.

## Run PostgreSQL

```bash
cd backend
docker compose up -d postgres
```

PostgreSQL runs at `localhost:5432` with the development credentials from `backend/.env.example`.

## Run Migrations

```bash
cd backend
.venv\Scripts\activate
alembic upgrade head
```

## Run the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
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

## Test Authentication

1. Start PostgreSQL with `docker compose up -d postgres` from `backend/`.
2. Run `alembic upgrade head` from `backend/`.
3. Start the backend with `uvicorn app.main:app --reload`.
4. Start the frontend with `npm run dev` from `frontend/`.
5. Open the landing page and click `Create Account`.
6. Register with the `Personal User` category.
7. Confirm you are redirected to scenarios.
8. Open `Profile` and confirm the user category and language display.
9. Logout, then log in again.
10. Try `Continue as Guest`, choose whether to save progress, and confirm scenarios are accessible.

## Next Steps

1. Shopping scenario state-machine
2. Avatar assistant
3. Gemini/ElevenLabs integration
