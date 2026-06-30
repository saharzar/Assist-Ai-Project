# ASSIST-AI

ASSIST-AI is a multilingual practice platform that helps learners build confidence in everyday situations through simple, step-by-step scenario guidance. The current foundation includes a polished React landing experience, authentication, guest mode, user category selection, admin account approval, a PostgreSQL-backed FastAPI API, and a scenario catalogue preview.

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
- Admin account approval workflow
- Console email logging or real SMTP notifications for account request, approval, and denial notices
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
- `GET /admin/users`
- `GET /admin/users/pending`
- `POST /admin/users/{user_id}/approve`
- `POST /admin/users/{user_id}/deny`
- `POST /admin/email/test`

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
3. Create the first admin with `python scripts\create_admin.py`.
4. Start the backend with `uvicorn app.main:app --reload`.
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

To test real SMTP, set `EMAIL_ENABLED=true`, `EMAIL_BACKEND=smtp`, and your SMTP variables in `backend/.env`, restart the backend, call `POST /admin/email/test`, then repeat registration, approval, and denial with test users.

## Next Steps

1. Shopping scenario state-machine
2. Avatar assistant
3. Gemini/ElevenLabs integration
