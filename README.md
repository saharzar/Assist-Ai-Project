# ASSIST-AI

ASSIST-AI is an English practice platform that helps learners build confidence in everyday situations through simple, step-by-step scenario guidance. The current app includes a polished React frontend, authentication, guest mode, user category selection, admin account approval, SMTP email notifications, a PostgreSQL-backed FastAPI API, and an interactive ATM withdrawal practice scenario with voice guidance.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Alembic, JWT authentication
- Database: PostgreSQL via Docker Compose
- Data: Static typed scenario lists plus persisted users, guest sessions, TTS usage, and cached TTS audio metadata

## Current Status

ASSIST-AI currently includes authentication, admin account management, and the ATM practice scenario.

This version includes:

- Landing page
- Register, login, guest consent, and profile pages
- JWT authentication
- Admin dashboard for user approvals, denials, suspension, and activation
- Console email logging or real SMTP notifications for account request, approval, denial, suspension, and activation notices
- PostgreSQL users and guest sessions
- User category selection during sign up
- Scenario catalogue with the ATM scenario enabled
- Realistic ATM practice interface with clickable keypad and keyboard overlays
- Azure Speech voice assistant prompts with per-user TTS character usage tracking
- Backend TTS audio caching for repeated fixed prompts and split dynamic PIN/name segments
- Speech input for supported steps and applause feedback on success
- `GET /health`
- `GET /api/scenarios`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guests/session`
- `GET /admin/users`
- `GET /admin/users/pending`
- `POST /admin/users/{user_id}/approve`
- `POST /admin/users/{user_id}/deny`
- `POST /admin/users/{user_id}/suspend`
- `POST /admin/users/{user_id}/activate`
- `POST /admin/email/test`
- `GET /api/tts/usage`
- `POST /api/tts`

Other scenarios are visible as locked or disabled previews while the ATM scenario is the active practice flow.

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

## Create the First Admin

Create `backend/.env` from `backend/.env.example`, then set:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_password
ADMIN_FULL_NAME=ASSIST-AI Admin
ADMIN_NOTIFICATION_EMAIL=admin@example.com
APP_FRONTEND_URL=http://localhost:5173
EMAIL_ENABLED=false
EMAIL_BACKEND=console
```

Run:

```bash
cd backend
.venv\Scripts\activate
python scripts\create_admin.py
```

The script creates or updates the admin account with `role=admin`, `approval_status=approved`, and `is_active=true`.

## Email Notifications

By default, ASSIST-AI uses console email logging for development. Account request, approval, denial, and admin notification emails are logged to the backend console and no real SMTP message is sent.

To enable real SMTP, set these values in `backend/.env` and restart the backend:

```env
EMAIL_ENABLED=true
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=ASSIST-AI
SMTP_USE_TLS=true
SMTP_USE_SSL=false
ADMIN_NOTIFICATION_EMAIL=admin@example.com
APP_FRONTEND_URL=http://localhost:5173
```

Use `SMTP_USE_TLS=true` for STARTTLS on port 587. Use `SMTP_USE_SSL=true` for SSL on port 465. If SMTP is enabled but required config is missing, the backend falls back to console logging and writes a warning without exposing SMTP credentials.

After logging in as an admin, send a test email with:

```bash
curl -X POST http://127.0.0.1:8000/admin/email/test -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

The endpoint returns `{"message":"Test email processed."}` whether the message was handled by console mode or SMTP mode.

## Azure Speech Voice Assistant

ASSIST-AI uses Azure AI Speech for Text-To-Speech through the backend. The frontend never receives the Azure key. It calls `POST /api/tts`, and the backend:

1. Confirms the user is logged in.
2. Checks the user's TTS character limit.
3. Looks for cached audio.
4. Calls Azure only when needed.
5. Updates PostgreSQL usage.
6. Returns MP3 audio to the frontend.

Add these values to `backend/.env`:

```env
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=swedencentral
TTS_DEFAULT_LIMIT_CHARACTERS=5000
TTS_MAX_REQUEST_CHARACTERS=1000
TTS_DEFAULT_VOICE=en-US-JennyNeural
TTS_CACHE_DIR=media/tts-cache
AZURE_TTS_MONTHLY_LIMIT_CHARACTERS=500000
AZURE_STT_MONTHLY_LIMIT_SECONDS=18000
SPEECH_WARNING_THRESHOLD_PERCENT=80
SPEECH_SWITCH_THRESHOLD_PERCENT=95
```

The voice assistant supports the site languages with Azure neural voices:

- English: `en-US-JennyNeural`
- Spanish: `es-ES-ElviraNeural`
- German: `de-DE-KatjaNeural`
- Turkish: `tr-TR-EmelNeural`
- Portuguese: `pt-PT-RaquelNeural`
- French: `fr-FR-DeniseNeural`

TTS billing is character-based, so ASSIST-AI tracks usage by characters, not tokens. The frontend shows the remaining voice allowance in the top navigation for logged-in users.

Generated audio is cached under `backend/media/tts-cache`, and metadata is stored in PostgreSQL. The `backend/media/` folder is ignored by Git because cached audio is generated locally. Repeated prompts are returned from cache without using new TTS characters. PIN and name-confirmation prompts are split so fixed sentence parts can be cached while only the dynamic name or PIN part is generated when needed.

Administrators can open **Speech Provider Management** from the admin dashboard to monitor the internally estimated monthly Azure TTS character usage and STT audio duration. Automatic mode continues using Azure after the warning threshold and routes new requests to browser speech at the switch threshold. Azure provider failures also activate browser fallback until the next billing month. Automatic, Azure, and Browser modes can be configured independently for TTS and STT.

The monthly provider totals are global estimates based only on ASSIST-AI requests; Azure does not provide a remaining-free-quota API. They are separate from each user's weekly TTS and STT allowance. Cached TTS audio and browser speech do not consume the estimated Azure quota, and request IDs prevent retries from being counted twice.

## Run the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

If the frontend shows an Azure Speech configuration error, check that `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` are set in `backend/.env`, then restart the backend.

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
3. Create the first admin with `python scripts\create_admin.py`.
4. Start the backend with `python -m uvicorn app.main:app --reload`.
5. Start the frontend with `npm run dev` from `frontend/`.
6. Register a normal user with the `Personal User` category.
7. Confirm the backend logs console emails to the user and admin.
8. Try logging in as the pending user and confirm login is blocked.
9. Log in as admin and open `/admin/users`.
10. Approve the pending user.
11. Confirm the backend logs a console approval email.
12. Logout admin, then log in as the approved user.
13. Register another user and deny that user from the admin dashboard.
14. Confirm the denied user cannot log in.
15. Try `Continue as Guest`, choose whether to save progress, and confirm scenarios are accessible.

To test real SMTP, set `EMAIL_ENABLED=true`, `EMAIL_BACKEND=smtp`, and your SMTP variables in `backend/.env`, restart the backend, call `POST /admin/email/test`, then repeat registration, approval, denial, suspension, and activation with test users.

To test Azure TTS, set the Azure Speech variables in `backend/.env`, restart the backend, log in as an approved user, open the ATM scenario, and confirm the assistant speaks. The first time a prompt is spoken it may spend TTS characters; repeated cached prompts should reuse saved audio.

## Docker Deployment

Production Docker files are included for PostgreSQL, the FastAPI backend, and the React/Nginx frontend. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy ASSIST-AI on a Linux VPS.
